/**
 * The Claude client of the tutor — the only file in the app that imports the
 * Anthropic SDK. It is loaded with a dynamic import() the first time the
 * tutor is used, so the SDK never weighs on the lesson loop.
 *
 * The key is the learner's own and the requests go straight from the browser
 * to Anthropic: there is no server of ours in between to keep a key on.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { TUTOR_MODEL, chatTask, explainTask, textCheckTask, translateTask, type Task } from './prompts';
import {
  TutorError,
  type ChatReply,
  type ChatTurn,
  type PhraseResult,
  type Scenario,
  type TextCheck,
  type Tutor,
  type TutorUsage,
} from './types';

const FixSchema = z.object({ from: z.string(), to: z.string(), why: z.string() });
const PhraseSchema = z.object({
  ka: z.string(),
  literal: z.string(),
  words: z.array(z.object({ ka: z.string(), ru: z.string(), note: z.string() })),
  note: z.string(),
});
const TextCheckSchema = z.object({
  corrected: z.string(),
  ru: z.string(),
  fixes: z.array(FixSchema),
  comment: z.string(),
});
const ChatSchema = z.object({
  ka: z.string(),
  ru: z.string(),
  fix: FixSchema.nullable(),
  hint: z.string(),
});

/** If a safety classifier declines a request, let the API route it to a fallback model instead of failing. */
const BETAS: Anthropic.Beta.AnthropicBeta[] = ['server-side-fallback-2026-07-01'];
const MAX_TOKENS = 16_000;

type Effort = 'low' | 'medium';

function toTutorError(e: unknown): TutorError {
  if (e instanceof TutorError) return e;
  if (e instanceof Anthropic.AuthenticationError) return new TutorError('auth', 'Ключ не принят. Проверь его в настройках.');
  if (e instanceof Anthropic.PermissionDeniedError) return new TutorError('auth', 'У этого ключа нет доступа к модели.');
  if (e instanceof Anthropic.RateLimitError) {
    return new TutorError('rate', 'Слишком много запросов или исчерпан лимит ключа. Попробуй чуть позже.');
  }
  if (e instanceof Anthropic.APIConnectionError) return new TutorError('offline', 'Нет связи с сервером. Проверь интернет.');
  if (e instanceof Anthropic.BadRequestError) return new TutorError('bad', `Запрос отклонён: ${e.message}`);
  if (e instanceof Anthropic.APIError) {
    return new TutorError('other', `Сервер ответил ошибкой${e.status ? ` ${e.status}` : ''}. Попробуй ещё раз.`);
  }
  return new TutorError('other', e instanceof Error ? e.message : 'Не получилось получить ответ.');
}

export function createTutor(apiKey: string, coursePrompt: string): Tutor {
  const client = new Anthropic({
    apiKey,
    // The learner's own key on the learner's own device — see the note at the top.
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    timeout: 90_000,
  });
  let usage: TutorUsage | null = null;

  const system = (task: Task): Anthropic.Beta.BetaTextBlockParam[] => [
    // Stable across every request of the tutor, so it is read from the cache after the first one.
    { type: 'text', text: coursePrompt, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: task.instructions },
  ];

  const note = (m: Anthropic.Beta.BetaMessage): void => {
    usage = {
      input: m.usage.input_tokens,
      output: m.usage.output_tokens,
      cacheRead: m.usage.cache_read_input_tokens ?? 0,
      cacheWrite: m.usage.cache_creation_input_tokens ?? 0,
    };
    if (m.stop_reason === 'refusal') throw new TutorError('refused', 'Модель отказалась отвечать на этот запрос.');
    if (m.stop_reason === 'max_tokens') throw new TutorError('other', 'Ответ получился слишком длинным и оборвался.');
  };

  async function structured<T extends z.ZodType>(
    schema: T,
    task: Task,
    messages: Anthropic.Beta.BetaMessageParam[],
    effort: Effort,
  ): Promise<{ data: z.infer<T>; content: Anthropic.Beta.BetaMessage['content'] }> {
    try {
      const m = await client.beta.messages.parse({
        model: TUTOR_MODEL,
        max_tokens: MAX_TOKENS,
        betas: BETAS,
        fallbacks: 'default',
        system: system(task),
        messages,
        output_config: { effort, format: betaZodOutputFormat(schema) },
      });
      note(m);
      if (m.parsed_output == null) throw new TutorError('other', 'Ответ пришёл в неожиданном виде. Попробуй ещё раз.');
      return { data: m.parsed_output as z.infer<T>, content: m.content };
    } catch (e) {
      throw toTutorError(e);
    }
  }

  return {
    async testKey() {
      try {
        await client.models.retrieve(TUTOR_MODEL);
      } catch (e) {
        throw toTutorError(e);
      }
    },

    async translate(ru, unlocked): Promise<PhraseResult> {
      const task = translateTask(ru, unlocked);
      return (await structured(PhraseSchema, task, [{ role: 'user', content: task.user }], 'medium')).data;
    },

    async explain(context, onText): Promise<string> {
      const task = explainTask(context);
      try {
        const stream = client.beta.messages.stream({
          model: TUTOR_MODEL,
          max_tokens: MAX_TOKENS,
          betas: BETAS,
          fallbacks: 'default',
          system: system(task),
          messages: [{ role: 'user', content: task.user }],
          output_config: { effort: 'low' },
        });
        stream.on('text', onText);
        const m = await stream.finalMessage();
        note(m);
        return m.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      } catch (e) {
        throw toTutorError(e);
      }
    },

    async checkText(ka, unlocked): Promise<TextCheck> {
      const task = textCheckTask(ka, unlocked);
      return (await structured(TextCheckSchema, task, [{ role: 'user', content: task.user }], 'medium')).data;
    },

    async chat(scenario: Scenario, history: ChatTurn[], unlocked): Promise<{ reply: ChatReply; turn: ChatTurn }> {
      const task = chatTask(scenario, unlocked);
      const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: task.user }];
      for (const turn of history) {
        messages.push(
          turn.role === 'user'
            ? { role: 'user', content: turn.text }
            : // The tutor's own turns go back exactly as the API returned them.
              { role: 'assistant', content: turn.raw as Anthropic.Beta.BetaContentBlockParam[] },
        );
      }
      const { data, content } = await structured(ChatSchema, task, messages, 'low');
      return { reply: data, turn: { role: 'assistant', raw: content } };
    },

    lastUsage: () => usage,
  };
}
