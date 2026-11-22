import { useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Pill } from '../components/ui/Pill';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { trVisible } from '../content/reading';
import { translit } from '../content/translit';
import { getCourse } from '../db/progress';
import { subscribeSecrets } from '../db/secrets';
import {
  SCENARIOS,
  getTutor,
  tutorBlocked,
  type ChatReply,
  type ChatTurn,
  type Fix,
  type Scenario,
  type TextCheck,
} from '../tutor';
import { tagFor } from '../tutor/phrases';
import { AiBadge } from './session/parts';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
`;

const Body = styled.div`
  padding: 4px 20px 28px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.card};
  border-radius: 20px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Small = styled.div`
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const ErrorText = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.danger};
`;

const Area = styled.textarea`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-size: 17px;
  line-height: 1.4;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.ink};
  resize: vertical;
  min-height: 56px;
`;

const Bubble = styled.div<{ $mine: boolean }>`
  align-self: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  max-width: 88%;
  padding: 12px 14px;
  border-radius: 18px;
  background: ${({ $mine, theme }) => ($mine ? theme.colors.blueSoft : theme.colors.card)};
  box-shadow: ${({ $mine, theme }) => ($mine ? 'none' : theme.shadow)};
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Ka = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-size: 19px;
  font-weight: 700;
  line-height: 1.35;
`;

const Ru = styled.div`
  font-size: 14px;
  font-weight: 700;
`;

const FixBox = styled.div`
  align-self: flex-end;
  max-width: 88%;
  padding: 10px 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.warnSoft};
  font-size: 13px;
  line-height: 1.45;

  b {
    font-family: ${({ theme }) => theme.fonts.ka};
    font-weight: 700;
  }
`;

type Line = { who: 'tutor'; reply: ChatReply } | { who: 'me'; text: string; fix?: Fix };

function FixLine({ fix }: { fix: Fix }) {
  return (
    <>
      <b>{fix.from}</b> → <b>{fix.to}</b>. {fix.why}
    </>
  );
}

/** A short role-play in Georgian. The dialogue lives only on this screen: nothing is stored. */
function Dialogue({ blocked }: { blocked: string | null }) {
  const [scenario, setScenario] = useState<Scenario>('cafe');
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const history = useRef<ChatTurn[]>([]);

  const started = lines.length > 0;

  const turn = async (say: string | null) => {
    if (busy) return;
    setBusy(true);
    setError('');
    const next = say == null ? history.current : [...history.current, { role: 'user' as const, text: say }];
    if (say != null) setLines((l) => [...l, { who: 'me', text: say }]);
    try {
      const { reply, turn: mine } = await (await getTutor()).chat(scenario, next, getCourse().unlocked);
      history.current = [...next, mine];
      setLines((l) => {
        const out = [...l];
        // A correction belongs to the learner's line it is about.
        const last = out[out.length - 1];
        if (reply.fix && last?.who === 'me') out[out.length - 1] = { ...last, fix: reply.fix };
        return [...out, { who: 'tutor', reply }];
      });
      setText('');
    } catch (e) {
      // The learner's line stays on screen; it was not added to the history, so "send" can simply be pressed again.
      if (say != null) setLines((l) => l.slice(0, -1));
      setError(e instanceof Error ? e.message : 'Не получилось получить ответ.');
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    history.current = [];
    setLines([]);
    setText('');
    setError('');
  };

  return (
    <>
      <Card>
        <Small>
          Короткий разговор по-грузински на словах пройденных уроков. Репетитор отвечает, поправляет ошибки и
          подсказывает, что сказать дальше.
        </Small>
        <Row>
          {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
            <Pill key={s} size="sm" kind={scenario === s ? 'dark' : 'ghost'} disabled={started} onClick={() => setScenario(s)}>
              {SCENARIOS[s].titleRu}
            </Pill>
          ))}
        </Row>
        {blocked ? (
          <Small>{blocked}</Small>
        ) : started ? (
          <Row>
            <Pill kind="ghost" size="sm" disabled={busy} onClick={restart}>
              Начать заново
            </Pill>
          </Row>
        ) : (
          <Row>
            <Pill kind="primary" size="md" disabled={busy} onClick={() => void turn(null)}>
              {busy ? 'Начинаю…' : 'Начать диалог'}
            </Pill>
          </Row>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </Card>

      {lines.map((l, i) =>
        l.who === 'tutor' ? (
          <Bubble key={i} $mine={false}>
            <AiBadge tag={tagFor(l.reply.ka)} />
            <Ka>{l.reply.ka}</Ka>
            {trVisible(l.reply.ka) && <Small>{translit(l.reply.ka)}</Small>}
            <Ru>{l.reply.ru}</Ru>
            {l.reply.hint && i === lines.length - 1 && <Small>Подсказка: {l.reply.hint}</Small>}
          </Bubble>
        ) : (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Bubble $mine>
              <Ka>{l.text}</Ka>
            </Bubble>
            {l.fix && (
              <FixBox>
                <FixLine fix={l.fix} />
              </FixBox>
            )}
          </div>
        ),
      )}

      {started && !blocked && (
        <Card>
          <Area
            value={text}
            placeholder="Твой ответ по-грузински"
            aria-label="Твой ответ"
            onChange={(e) => setText(e.target.value)}
          />
          <Row>
            <Pill kind="primary" size="md" disabled={busy || !text.trim()} onClick={() => void turn(text.trim())}>
              {busy ? 'Жду ответа…' : 'Отправить'}
            </Pill>
          </Row>
        </Card>
      )}
    </>
  );
}

/** Check a text the learner wrote in Georgian: corrections one by one, and the corrected text. */
function TextCheckTab({ blocked }: { blocked: string | null }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TextCheck | null>(null);

  const check = async () => {
    const ka = text.trim();
    if (!ka || busy) return;
    setBusy(true);
    setError('');
    try {
      setResult(await (await getTutor()).checkText(ka, getCourse().unlocked));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не получилось проверить текст.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <Small>
          Напиши по-грузински несколько фраз о себе, о вчерашнем дне или о планах. Репетитор исправит ошибки и
          объяснит каждую.
        </Small>
        <Area
          value={text}
          style={{ minHeight: 120 }}
          placeholder="მე მქვია…"
          aria-label="Текст по-грузински"
          onChange={(e) => setText(e.target.value)}
        />
        {blocked ? (
          <Small>{blocked}</Small>
        ) : (
          <Row>
            <Pill kind="primary" size="md" disabled={busy || !text.trim()} onClick={() => void check()}>
              {busy ? 'Проверяю…' : 'Проверить'}
            </Pill>
          </Row>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </Card>

      {result && (
        <Card>
          <AiBadge tag={tagFor(result.corrected)} />
          <Ka>{result.corrected}</Ka>
          {trVisible(result.corrected) && <Small>{translit(result.corrected)}</Small>}
          <Ru>{result.ru}</Ru>
          {result.fixes.length === 0 ? (
            <Small>Ошибок не найдено.</Small>
          ) : (
            result.fixes.map((f, i) => (
              <FixBox key={i} style={{ alignSelf: 'stretch', maxWidth: 'none' }}>
                <FixLine fix={f} />
              </FixBox>
            ))
          )}
          {result.comment && <Small>{result.comment}</Small>}
        </Card>
      )}
    </>
  );
}

/**
 * The AI tutor: a role-play dialogue and a check of the learner's own text.
 * Both need the learner's Claude key and a connection; nothing in the daily
 * session depends on this screen.
 */
export function TutorScreen() {
  const navigate = useNavigate();
  const blocked = useSyncExternalStore(subscribeSecrets, tutorBlocked);
  const [tab, setTab] = useState<'chat' | 'text'>('chat');

  return (
    <Screen>
      <ScreenHeader title="Репетитор" onBack={() => navigate('/')} />
      <Body>
        <Tabs>
          <Pill size="sm" kind={tab === 'chat' ? 'dark' : 'ghost'} onClick={() => setTab('chat')}>
            Диалог
          </Pill>
          <Pill size="sm" kind={tab === 'text' ? 'dark' : 'ghost'} onClick={() => setTab('text')}>
            Проверить текст
          </Pill>
          {blocked && (
            <Pill size="sm" kind="ghost" onClick={() => navigate('/settings')}>
              В настройки
            </Pill>
          )}
        </Tabs>
        {tab === 'chat' ? <Dialogue blocked={blocked} /> : <TextCheckTab blocked={blocked} />}
      </Body>
    </Screen>
  );
}
