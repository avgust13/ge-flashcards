import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  downloadAllAudio,
  offlineStatus,
  offlineSupported,
  storageUsed,
  type OfflineStatus,
} from '../audio/cache';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionLabel } from '../components/ui/SectionLabel';
import { IosInstallSheet } from '../components/install/IosInstallSheet';
import { applyStatsToWords } from '../data/stats';
import { WORDS } from '../data/words';
import { exportBackupToUser, parseBackup, restoreBackup } from '../db/backup';
import { cardCount, getSettings, resetProgress, setSettings } from '../db/progress';
import { useProgressVersion } from '../db/useProgress';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { getClockOffset, setClockOffset } from '../srs/clock';
import { useWordsLoad } from '../state/WordsContext';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.ink};
  font-family: ${({ theme }) => theme.fonts.ui};
`;

const Body = styled.div`
  padding: 8px 20px 20px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
  border: 1px solid ${({ theme }) => theme.colors.line};
  padding: 6px 16px;
  margin-bottom: 18px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.line};

  &:first-child {
    border-top: none;
  }

  @media (max-width: 480px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const Meta = styled.div`
  min-width: 0;
  flex: 1;
`;

const Title = styled.div`
  font-weight: 800;
  font-size: 16px;
`;

const Desc = styled.div`
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 13px;
  line-height: 1.45;
`;

const Message = styled.div<{ $isError?: boolean }>`
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme, $isError }) => ($isError ? theme.colors.danger : theme.colors.success)};
`;

const Choices = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Notice = styled.div`
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 12px;
  line-height: 1.45;
  margin-bottom: 18px;
`;

const Footer = styled.footer`
  margin-top: auto;
  padding: 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 13px;
`;

const FooterLink = styled.a`
  width: 40px;
  height: 40px;
  margin: 8px auto 0;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.inkSoft};
  text-decoration: none;
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadow};
`;

const MINUTES = [10, 15, 18, 20, 25, 30];

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

function formatDate(ts: number | null): string {
  if (!ts) return 'ещё не делалась';
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function SettingsScreen() {
  const navigate = useNavigate();
  useProgressVersion();
  const settings = getSettings();
  const { reloadWords, reloading, error } = useWordsLoad();
  const { canShowSettings, platform, install } = useInstallPrompt();
  const [status, setStatus] = useState('');
  const [backupMsg, setBackupMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [resetMsg, setResetMsg] = useState('');
  const [speechMsg, setSpeechMsg] = useState('');
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [clock, setClock] = useState(getClockOffset());
  const fileInput = useRef<HTMLInputElement>(null);
  const [offline, setOffline] = useState<OfflineStatus | null>(null);
  const [usedMb, setUsedMb] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [offlineMsg, setOfflineMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const refreshOffline = async () => {
    setOffline(await offlineStatus());
    const used = await storageUsed();
    setUsedMb(used == null ? null : Math.round(used / 1_048_576));
  };

  useEffect(() => {
    void refreshOffline();
  }, []);

  const onDownloadAudio = async () => {
    setDownloading(true);
    setOfflineMsg(null);
    try {
      const { failed } = await downloadAllAudio(setOffline);
      setOfflineMsg(
        failed
          ? { text: `Не скачалось клипов: ${failed}. Проверь сеть и нажми ещё раз.`, error: true }
          : { text: 'Весь звук курса сохранён на устройстве.' },
      );
    } catch (e) {
      setOfflineMsg({ text: (e as Error).message || 'Не удалось скачать звук.', error: true });
    } finally {
      setDownloading(false);
      void refreshOffline();
    }
  };

  const onInstallClick = () => {
    if (platform === 'ios') setShowIosSheet(true);
    else if (platform === 'native') void install();
  };

  const onRedownload = async () => {
    setStatus('');
    try {
      await reloadWords();
      setStatus('Словарь обновлён.');
    } catch {
      setStatus('');
    }
  };

  const onExport = async () => {
    setBackupMsg(null);
    try {
      await exportBackupToUser();
      setBackupMsg({ text: 'Копия сохранена.' });
    } catch (e) {
      setBackupMsg({ text: (e as Error).message || 'Не удалось сохранить копию.', error: true });
    }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    setBackupMsg(null);
    try {
      const backup = parseBackup(await file.text());
      const ok = window.confirm(
        `Восстановить копию от ${formatDate(backup.exportedAt)}?\n` +
          `Карточек: ${backup.cards.length}, ответов в журнале: ${backup.revlog.length}.\n` +
          'Текущий прогресс на этом устройстве будет заменён.',
      );
      if (!ok) return;
      await restoreBackup(backup);
      applyStatsToWords(WORDS);
      setBackupMsg({ text: 'Прогресс восстановлен из копии.' });
    } catch (e) {
      setBackupMsg({ text: (e as Error).message || 'Не удалось прочитать файл.', error: true });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onResetProgress = async () => {
    if (!window.confirm('Сбросить весь прогресс? Это действие нельзя отменить.')) return;
    setResetMsg('');
    await resetProgress();
    // Zero the scores on the words already in memory — no need to download them again.
    applyStatsToWords(WORDS);
    setResetMsg('Прогресс сброшен.');
  };

  const onSpeechProbe = () => {
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setSpeechMsg('В этом браузере распознавания речи нет.');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'ka-GE';
    rec.interimResults = false;
    let heard = false;
    rec.onresult = (e) => {
      heard = true;
      setSpeechMsg(`Распознано: «${e.results[0][0].transcript}». Грузинский поддерживается.`);
    };
    rec.onerror = (e) => {
      heard = true;
      setSpeechMsg(
        e.error === 'language-not-supported'
          ? 'Грузинский язык распознаванием не поддерживается.'
          : `Не получилось: ${e.error}.`,
      );
    };
    rec.onend = () => {
      if (!heard) setSpeechMsg('Ничего не услышано. Попробуй ещё раз и скажи «გამარჯობა».');
    };
    setSpeechMsg('Слушаю… скажи «გამარჯობა».');
    rec.start();
  };

  const shiftClock = (days: number) => {
    const next = days === 0 ? 0 : clock + days * 86_400_000;
    setClockOffset(next);
    setClock(next);
  };

  const installDesc =
    platform === 'ios'
      ? 'Добавь приложение на главный экран iPhone.'
      : platform === 'native'
        ? 'Отдельная иконка на главном экране.'
        : 'Открой на телефоне, чтобы установить.';

  return (
    <Screen>
      <ScreenHeader title="Настройки" onBack={() => navigate('/')} />
      <Body>
        <SectionLabel>Занятия</SectionLabel>
        <Card>
          <Row>
            <Meta>
              <Title>Минут в день</Title>
              <Desc>На это время рассчитывается «Занятие дня».</Desc>
            </Meta>
            <Choices>
              {MINUTES.map((m) => (
                <Pill
                  key={m}
                  size="sm"
                  kind={settings.dailyMinutes === m ? 'dark' : 'ghost'}
                  onClick={() => setSettings({ dailyMinutes: m })}
                >
                  {m}
                </Pill>
              ))}
            </Choices>
          </Row>
          <Row>
            <Meta>
              <Title>Обращение к себе</Title>
              <Desc>Для русских подсказок: «я сделал» или «я сделала».</Desc>
            </Meta>
            <Choices>
              <Pill size="sm" kind={settings.ruGender === 'm' ? 'dark' : 'ghost'} onClick={() => setSettings({ ruGender: 'm' })}>
                сделал
              </Pill>
              <Pill size="sm" kind={settings.ruGender === 'f' ? 'dark' : 'ghost'} onClick={() => setSettings({ ruGender: 'f' })}>
                сделала
              </Pill>
            </Choices>
          </Row>
          <Row>
            <Meta>
              <Title>Транслитерация</Title>
              <Desc>
                Латинская подпись под грузинским текстом. «Авто» убирает её у слов, все буквы которых ты уже
                выучил.
              </Desc>
            </Meta>
            <Choices>
              <Pill size="sm" kind={settings.translit === 'auto' ? 'dark' : 'ghost'} onClick={() => setSettings({ translit: 'auto' })}>
                авто
              </Pill>
              <Pill size="sm" kind={settings.translit === 'always' ? 'dark' : 'ghost'} onClick={() => setSettings({ translit: 'always' })}>
                всегда
              </Pill>
              <Pill size="sm" kind={settings.translit === 'never' ? 'dark' : 'ghost'} onClick={() => setSettings({ translit: 'never' })}>
                скрыть
              </Pill>
            </Choices>
          </Row>
          <Row>
            <Meta>
              <Title>Звук после ответа</Title>
              <Desc>Проигрывать грузинскую фразу сразу, как показан ответ.</Desc>
            </Meta>
            <Choices>
              <Pill size="sm" kind={settings.autoplay ? 'dark' : 'ghost'} onClick={() => setSettings({ autoplay: true })}>
                да
              </Pill>
              <Pill size="sm" kind={!settings.autoplay ? 'dark' : 'ghost'} onClick={() => setSettings({ autoplay: false })}>
                нет
              </Pill>
            </Choices>
          </Row>
        </Card>

        <SectionLabel>Резервная копия</SectionLabel>
        <Card>
          <Row>
            <Meta>
              <Title>Сохранить прогресс в файл</Title>
              <Desc>
                Карточек: {cardCount()}. Последняя копия: {formatDate(settings.lastBackupAt)}. Браузер может
                очистить данные сайта — копия это переживёт.
              </Desc>
              {backupMsg && <Message $isError={backupMsg.error}>{backupMsg.text}</Message>}
            </Meta>
            <Choices>
              <Pill kind="primary" size="sm" onClick={onExport}>
                Сохранить
              </Pill>
              <Pill kind="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                Восстановить
              </Pill>
            </Choices>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => void onImportFile(e.target.files?.[0])}
            />
          </Row>
        </Card>

        <SectionLabel>Офлайн</SectionLabel>
        <Card>
          <Row>
            <Meta>
              <Title>Звук курса на устройстве</Title>
              <Desc>
                {offline
                  ? `Скачано ${offline.cached} из ${offline.total} клипов.`
                  : 'Скачай весь звук заранее, чтобы заниматься без сети.'}{' '}
                Весь звук занимает около 10 МБ.
                {usedMb != null && ` Сейчас приложение хранит ${usedMb} МБ.`}
              </Desc>
              {offlineMsg && <Message $isError={offlineMsg.error}>{offlineMsg.text}</Message>}
            </Meta>
            <Pill
              kind={offline && offline.cached < offline.total ? 'primary' : 'ghost'}
              size="sm"
              disabled={downloading || !offlineSupported() || (!!offline && offline.cached >= offline.total)}
              onClick={onDownloadAudio}
            >
              {downloading ? 'Скачиваю…' : offline && offline.cached >= offline.total ? 'Скачано' : 'Скачать'}
            </Pill>
          </Row>
        </Card>

        <SectionLabel>Приложение</SectionLabel>
        <Card>
          <Row>
            <Meta>
              <Title>Словарь с картинками</Title>
              <Desc>Скачать заново библиотеку из 836 слов для свободной практики (около 67 МБ).</Desc>
              {reloading && <Desc>Идёт загрузка, подожди…</Desc>}
              {(error ?? status) && <Message $isError={Boolean(error)}>{error ?? status}</Message>}
            </Meta>
            <Pill kind="ghost" size="sm" onClick={onRedownload} disabled={reloading}>
              {reloading ? 'Обновляю…' : 'Обновить'}
            </Pill>
          </Row>
          {canShowSettings && (
            <Row>
              <Meta>
                <Title>Установить приложение</Title>
                <Desc>{installDesc}</Desc>
              </Meta>
              <Pill kind="ghost" size="sm" onClick={onInstallClick} disabled={platform === 'other'}>
                Установить
              </Pill>
            </Row>
          )}
          <Row>
            <Meta>
              <Title>Распознавание речи</Title>
              <Desc>Проверка: понимает ли этот телефон грузинскую речь. Нужно для будущей авто-проверки «скажи вслух».</Desc>
              {speechMsg && <Message>{speechMsg}</Message>}
            </Meta>
            <Pill kind="ghost" size="sm" onClick={onSpeechProbe}>
              Проверить
            </Pill>
          </Row>
          <Row>
            <Meta>
              <Title>Сбросить прогресс</Title>
              <Desc>Все карточки, журнал ответов и статистика слов начнутся с нуля.</Desc>
              {resetMsg && <Message>{resetMsg}</Message>}
            </Meta>
            <Pill kind="ghost" size="sm" onClick={onResetProgress}>
              Сбросить
            </Pill>
          </Row>
        </Card>

        {import.meta.env.DEV && (
          <>
            <SectionLabel>Отладка</SectionLabel>
            <Card>
              <Row>
                <Meta>
                  <Title>Сдвиг времени</Title>
                  <Desc>
                    Сейчас: +{Math.round(clock / 86_400_000)} дн. Только в режиме разработки — чтобы проверить
                    повторения на завтра.
                  </Desc>
                </Meta>
                <Choices>
                  <Pill size="sm" kind="ghost" onClick={() => shiftClock(1)}>
                    +1 день
                  </Pill>
                  <Pill size="sm" kind="ghost" onClick={() => shiftClock(0)}>
                    сброс
                  </Pill>
                </Choices>
              </Row>
            </Card>
          </>
        )}

        <Notice>
          Прогресс хранится только на этом устройстве, в памяти браузера. Аккаунта и сервера нет.
        </Notice>
      </Body>
      <Footer>
        Открытый проект на GitHub.
        <br />
        <FooterLink
          href="https://github.com/avgust13/ge-flashcards"
          target="_blank"
          rel="noreferrer"
          aria-label="Открыть проект на GitHub"
        >
          <Icon name="github" size={20} />
        </FooterLink>
      </Footer>
      <IosInstallSheet open={showIosSheet} onClose={() => setShowIosSheet(false)} />
    </Screen>
  );
}
