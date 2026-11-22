import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Pill } from '../components/ui/Pill';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionLabel } from '../components/ui/SectionLabel';
import { checkGeorgian } from '../content/known';
import { trVisible } from '../content/reading';
import { translit } from '../content/translit';
import { getCourse } from '../db/progress';
import { subscribeSecrets } from '../db/secrets';
import { useProgressVersion } from '../db/useProgress';
import { getTutor, tutorBlocked, type PhraseResult } from '../tutor';
import { isScheduled, removePhrase, reschedule, savePhrase, tagFor, userPhrases } from '../tutor/phrases';
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

const Card = styled.div`
  background: ${({ theme }) => theme.colors.card};
  border-radius: 20px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Area = styled.textarea`
  font: inherit;
  font-size: 16px;
  line-height: 1.4;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.ink};
  resize: vertical;
  min-height: 64px;
`;

const Ka = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
`;

const Small = styled.div`
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Ru = styled.div`
  font-size: 15px;
  font-weight: 700;
`;

const Words = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
`;

const Word = styled.div`
  font-size: 14px;
  line-height: 1.4;

  b {
    font-family: ${({ theme }) => theme.fonts.ka};
    font-weight: 700;
  }

  span {
    color: ${({ theme }) => theme.colors.inkSoft};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ErrorText = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.danger};
`;

const SavedKa = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-size: 18px;
  font-weight: 700;
`;

type Ask = { status: 'idle' } | { status: 'loading' } | { status: 'done'; ru: string; result: PhraseResult } | { status: 'error'; text: string };

/**
 * "Мои фразы": say what you need in Russian, get it in Georgian with a
 * word-by-word breakdown, and keep it as a card. Everything the tutor writes
 * is shown under a label that says whether its words are in the course tables.
 */
export function PhrasesScreen() {
  const navigate = useNavigate();
  useProgressVersion();
  // Re-render when a key is added or removed.
  useSyncExternalStore(subscribeSecrets, tutorBlocked);
  const [text, setText] = useState('');
  const [ask, setAsk] = useState<Ask>({ status: 'idle' });
  const [confirm, setConfirm] = useState<string | null>(null);

  const blocked = tutorBlocked();
  const phrases = userPhrases();

  const translate = async () => {
    const ru = text.trim();
    if (!ru || ask.status === 'loading') return;
    setAsk({ status: 'loading' });
    try {
      const result = await (await getTutor()).translate(ru, getCourse().unlocked);
      setAsk({ status: 'done', ru, result });
    } catch (e) {
      setAsk({ status: 'error', text: e instanceof Error ? e.message : 'Не получилось получить перевод.' });
    }
  };

  const keep = () => {
    if (ask.status !== 'done') return;
    savePhrase(ask.ru, ask.result);
    setAsk({ status: 'idle' });
    setText('');
  };

  const unknown = ask.status === 'done' ? checkGeorgian(ask.result.ka).unknown : [];

  return (
    <Screen>
      <ScreenHeader title="Мои фразы" onBack={() => navigate('/')} />
      <Body>
        <Card>
          <Small>
            Напиши по-русски то, что хочешь сказать. Репетитор переведёт, разберёт по словам, а фразу можно добавить в
            повторения.
          </Small>
          <Area
            value={text}
            placeholder="Например: Где здесь аптека?"
            aria-label="Фраза по-русски"
            onChange={(e) => setText(e.target.value)}
          />
          {blocked ? (
            <>
              <Small>{blocked}</Small>
              <Actions>
                <Pill kind="ghost" size="sm" onClick={() => navigate('/settings')}>
                  В настройки
                </Pill>
              </Actions>
            </>
          ) : (
            <Actions>
              <Pill kind="primary" size="md" disabled={!text.trim() || ask.status === 'loading'} onClick={() => void translate()}>
                {ask.status === 'loading' ? 'Перевожу…' : 'Перевести'}
              </Pill>
            </Actions>
          )}
          {ask.status === 'error' && <ErrorText>{ask.text}</ErrorText>}
        </Card>

        {ask.status === 'done' && (
          <Card>
            <AiBadge tag={tagFor(ask.result.ka)} />
            <Ka>{ask.result.ka}</Ka>
            {trVisible(ask.result.ka) && <Small>{translit(ask.result.ka)}</Small>}
            <Ru>{ask.ru}</Ru>
            <Small>Дословно: {ask.result.literal}</Small>
            {ask.result.words.length > 0 && (
              <Words>
                {ask.result.words.map((w, i) => (
                  <Word key={i}>
                    <b>{w.ka}</b> — {w.ru}
                    {w.note && <span> · {w.note}</span>}
                  </Word>
                ))}
              </Words>
            )}
            {ask.result.note && <Small>{ask.result.note}</Small>}
            {unknown.length > 0 && (
              <Small>
                Этих слов нет в проверенных таблицах курса: {unknown.join(', ')}. Фраза может быть верной, но приложение
                не может это подтвердить.
              </Small>
            )}
            <Actions>
              <Pill kind="primary" size="sm" onClick={keep}>
                Добавить в повторения
              </Pill>
              <Pill kind="ghost" size="sm" onClick={() => setAsk({ status: 'idle' })}>
                Не сохранять
              </Pill>
            </Actions>
          </Card>
        )}

        {phrases.length > 0 && <SectionLabel>Сохранённые</SectionLabel>}
        {phrases.map((p) => (
          <Card key={p.id}>
            <AiBadge tag={tagFor(p.ka)} />
            <SavedKa>{p.ka}</SavedKa>
            {trVisible(p.ka) && <Small>{translit(p.ka)}</Small>}
            <Ru>{p.ru}</Ru>
            {p.literal && <Small>Дословно: {p.literal}</Small>}
            <Actions>
              {!isScheduled(p.id) && (
                <Pill kind="ghost" size="sm" onClick={() => reschedule(p)}>
                  Вернуть в повторения
                </Pill>
              )}
              {confirm === p.id ? (
                <>
                  <Pill kind="dark" size="sm" onClick={() => removePhrase(p.id)}>
                    Да, удалить
                  </Pill>
                  <Pill kind="ghost" size="sm" onClick={() => setConfirm(null)}>
                    Оставить
                  </Pill>
                </>
              ) : (
                <Pill kind="ghost" size="sm" onClick={() => setConfirm(p.id)}>
                  Удалить
                </Pill>
              )}
            </Actions>
          </Card>
        ))}
      </Body>
    </Screen>
  );
}
