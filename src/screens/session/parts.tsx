import { useState } from 'react';
import { AI_TAG_RU, type AiTag } from '../../content/types';
import { addReport, hideCard } from '../../db/reports';
import type { Exercise } from '../../engine/types';
import { getTutor, tutorBlocked } from '../../tutor';
import { describeExercise } from '../../tutor/context';
import { tagFor } from '../../tutor/phrases';
import styled, { css, keyframes } from 'styled-components';
import { SpeakerButton } from '../../components/ui/SpeakerButton';
import { trOnReveal } from '../../content/reading';
import { translit } from '../../content/translit';
import type { Reveal } from '../../engine/types';

export const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 20px 8px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
`;

export const Footer = styled.div`
  padding: 10px 20px 16px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  gap: 10px;
`;

export const Eyebrow = styled.div`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.inkMute};
`;

export const Card = styled.div`
  background: #fff;
  border-radius: 22px;
  padding: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
`;

export const PromptRu = styled.div`
  font-size: 24px;
  font-weight: 900;
  line-height: 1.25;
  margin-top: 6px;
`;

export const Ka = styled.div<{ $size?: number }>`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: ${({ $size }) => $size ?? 28}px;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.ink};
`;

export const Tr = styled.div`
  font-size: 14px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

export const Muted = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
  line-height: 1.4;
`;

const shakeAnim = keyframes`
  10%, 90% { transform: translateX(-3px); }
  20%, 80% { transform: translateX(5px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
`;

export const shake = css`
  animation: ${shakeAnim} 0.35s;
`;

const RevealBox = styled.div<{ $ok: boolean }>`
  border-radius: 20px;
  padding: 16px;
  background: ${({ $ok, theme }) => ($ok ? theme.colors.successSoft : theme.colors.warnSoft)};
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const RevealText = styled.div`
  flex: 1;
  min-width: 0;
`;

const RevealRu = styled.div`
  font-size: 15px;
  font-weight: 700;
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.ink};
`;

const Note = styled.div`
  font-size: 13px;
  line-height: 1.4;
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Badge = styled.span<{ $tag: AiTag }>`
  display: inline-flex;
  align-self: flex-start;
  margin-bottom: 6px;
  padding: 3px 9px;
  border-radius: 99px;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.01em;
  background: ${({ $tag, theme }) => ($tag === 'checked' ? theme.colors.purpleSoft : theme.colors.warnSoft)};
  color: ${({ $tag, theme }) => ($tag === 'checked' ? theme.colors.purple : '#8A5A00')};
`;

/** Says that a piece of Georgian came from the AI tutor, and whether its words are in the course tables. */
export function AiBadge({ tag }: { tag: AiTag }) {
  return <Badge $tag={tag}>{AI_TAG_RU[tag]}</Badge>;
}

const Links = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 6px;
`;

const ReportLink = styled.button`
  padding: 4px 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkMute};
  text-decoration: underline;
  cursor: pointer;
`;

const ReportBox = styled.div`
  margin-top: 8px;
  padding: 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.card};
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};

  textarea {
    font: inherit;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.ink};
    border: 1px solid ${({ theme }) => theme.colors.line};
    border-radius: 12px;
    padding: 8px 10px;
    resize: vertical;
    min-height: 56px;
  }
`;

const WhyText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.ink};
  white-space: pre-wrap;
`;

const ReportActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.colors.line};
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.ink};
    cursor: pointer;
  }
`;

interface RevealProps {
  reveal: Reveal;
  /** false: the answer is being shown after a miss. */
  ok?: boolean;
  /** The exercise behind the answer; with it the learner can flag a mistake or ask the tutor why. */
  source?: Exercise;
  /** The learner's wrong answer, when there was one: the tutor says what was off in it. */
  given?: string | null;
}

type Why = { status: 'idle' | 'loading' | 'done' | 'error'; text: string };

/**
 * The correct answer: Georgian, transliteration, Russian, a replay button and
 * an optional rule — plus two ways out for a puzzled learner: ask the tutor
 * why, or say "this looks wrong".
 */
export function RevealCard({ reveal, ok = true, source, given }: RevealProps) {
  const [stage, setStage] = useState<'idle' | 'form' | 'saved' | 'hidden'>('idle');
  const [note, setNote] = useState('');
  const [why, setWhy] = useState<Why>({ status: 'idle', text: '' });

  const save = (hide: boolean) => {
    if (!source) return;
    addReport({ t: Date.now(), card: source.card, sentenceId: source.sentenceId, ka: reveal.ka, ru: reveal.ru, note: note.trim() });
    if (hide) hideCard(source.card);
    setStage(hide ? 'hidden' : 'saved');
  };

  const askWhy = async () => {
    if (!source || why.status === 'loading') return;
    const blocked = tutorBlocked();
    if (blocked) {
      setWhy({ status: 'error', text: blocked });
      return;
    }
    setWhy({ status: 'loading', text: '' });
    try {
      const tutor = await getTutor();
      let acc = '';
      const full = await tutor.explain(describeExercise(source, given), (delta) => {
        acc += delta;
        setWhy({ status: 'loading', text: acc });
      });
      setWhy({ status: 'done', text: full });
    } catch (e) {
      setWhy({ status: 'error', text: e instanceof Error ? e.message : 'Не получилось получить объяснение.' });
    }
  };

  return (
    <>
      <RevealBox $ok={ok}>
        <RevealText>
          {reveal.ai && <AiBadge tag={reveal.ai} />}
          <Ka>{reveal.ka}</Ka>
          {trOnReveal() && <Tr>{translit(reveal.ka)}</Tr>}
          <RevealRu>{reveal.ru}</RevealRu>
          {reveal.note && <Note>{reveal.note}</Note>}
        </RevealText>
        <SpeakerButton audio={reveal.audio} size={42} tone="solid" />
      </RevealBox>
      {source && (
        <Links>
          {why.status === 'idle' && (
            <ReportLink type="button" onClick={askWhy}>
              Почему так?
            </ReportLink>
          )}
          {stage === 'idle' && (
            <ReportLink type="button" onClick={() => setStage('form')}>
              Здесь ошибка?
            </ReportLink>
          )}
        </Links>
      )}
      {why.status !== 'idle' && (
        <ReportBox>
          {why.status === 'error' ? (
            why.text
          ) : (
            <>
              <WhyText>{why.text || 'Репетитор думает…'}</WhyText>
              {why.status === 'done' && <AiBadge tag={tagFor(why.text)} />}
            </>
          )}
        </ReportBox>
      )}
      {source && stage === 'form' && (
        <ReportBox>
          Что не так? Замечание сохранится в настройках, оттуда его можно скопировать.
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: слово написано иначе" />
          <ReportActions>
            <button type="button" onClick={() => save(false)}>
              Сохранить
            </button>
            <button type="button" onClick={() => save(true)}>
              Сохранить и скрыть карточку
            </button>
            <button type="button" onClick={() => setStage('idle')}>
              Отмена
            </button>
          </ReportActions>
        </ReportBox>
      )}
      {source && stage === 'saved' && <Muted>Замечание сохранено.</Muted>}
      {source && stage === 'hidden' && <Muted>Замечание сохранено, карточка больше не появится. Вернуть её можно в настройках.</Muted>}
    </>
  );
}

/** Milliseconds → "1 мин", "3 ч", "5 дн", for the interval under each grade button. */
export function shortInterval(ms: number): string {
  const min = ms / 60_000;
  if (min < 1) return '<1 мин';
  if (min < 60) return `${Math.round(min)} мин`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} ч`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)} дн`;
  return `${Math.round(d / 30)} мес`;
}
