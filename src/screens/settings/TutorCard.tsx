import { useState, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import { Pill } from '../../components/ui/Pill';
import { TUTOR_KEY, deleteSecret, hasSecret, setSecret, subscribeSecrets } from '../../db/secrets';
import { TutorError, getTutor, resetTutor } from '../../tutor';

const Card = styled.div`
  background: ${({ theme }) => theme.colors.card};
  border-radius: 20px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Title = styled.div`
  font-size: 15px;
  font-weight: 800;
`;

const Desc = styled.div`
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Field = styled.input`
  font: inherit;
  font-size: 15px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.ink};
  width: 100%;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Message = styled.div<{ $error?: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $error, theme }) => ($error ? theme.colors.danger : theme.colors.success)};
`;

/**
 * The key of the AI tutor. It is the learner's own Claude API key: it stays in
 * this browser, is left out of backups, and is used only for requests that go
 * straight from here to Anthropic.
 */
export function TutorCard() {
  const present = useSyncExternalStore(subscribeSecrets, () => hasSecret(TUTOR_KEY));
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const test = async (): Promise<'ok' | 'rejected' | 'unknown'> => {
    try {
      await (await getTutor()).testKey();
      setMsg({ text: 'Ключ принят, репетитор готов.' });
      return 'ok';
    } catch (e) {
      const rejected = e instanceof TutorError && e.kind === 'auth';
      setMsg({ text: e instanceof Error ? e.message : 'Не удалось проверить ключ.', error: true });
      return rejected ? 'rejected' : 'unknown';
    }
  };

  const save = async () => {
    const key = value.trim();
    if (!key) return;
    setBusy(true);
    try {
      await setSecret(TUTOR_KEY, key);
      resetTutor();
      setValue('');
      // A key the service refuses is not worth keeping; one that could not be checked (no network) is.
      if ((await test()) === 'rejected') {
        await deleteSecret(TUTOR_KEY);
        resetTutor();
      }
    } catch {
      setMsg({ text: 'Не удалось сохранить ключ на устройстве.', error: true });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    await deleteSecret(TUTOR_KEY).catch(() => undefined);
    resetTutor();
    setMsg({ text: 'Ключ удалён с этого устройства.' });
    setBusy(false);
  };

  return (
    <Card>
      <Title>Ключ Claude {present ? '— сохранён' : ''}</Title>
      <Desc>
        Репетитор отвечает через Claude по твоему собственному ключу API. Ключ хранится только в этом браузере, не
        попадает в резервную копию и уходит только в запросах напрямую в Anthropic. Лучше завести для приложения
        отдельный ключ с небольшим лимитом расходов: один вопрос репетитору стоит несколько центов.
      </Desc>
      {present ? (
        <Actions>
          <Pill kind="ghost" size="sm" disabled={busy} onClick={() => void test()}>
            Проверить
          </Pill>
          <Pill kind="ghost" size="sm" disabled={busy} onClick={() => void remove()}>
            Удалить ключ
          </Pill>
        </Actions>
      ) : (
        <>
          <Field
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            aria-label="Ключ Claude API"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Actions>
            <Pill kind="primary" size="sm" disabled={busy || !value.trim()} onClick={() => void save()}>
              {busy ? 'Проверяю…' : 'Сохранить'}
            </Pill>
          </Actions>
        </>
      )}
      {msg && <Message $error={msg.error}>{msg.text}</Message>}
    </Card>
  );
}
