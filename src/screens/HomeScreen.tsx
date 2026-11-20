import { useMemo, useSyncExternalStore } from 'react';
import styled, { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { unlockAudio } from '../audio/player';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { SectionLabel } from '../components/ui/SectionLabel';
import { LETTERS, UNITS } from '../content/store';
import {
  allCards,
  allDays,
  cardCount,
  getCard,
  getCourse,
  getDay,
  getSettings,
  hasWriteError,
  putCard,
  today,
} from '../db/progress';
import { useProgressVersion } from '../db/useProgress';
import { cardInfo } from '../engine/build';
import { loadSavedSession, planDaily } from '../engine/run';
import { applyUpdate, isUpdateWaiting, subscribeUpdate } from '../pwa';
import { planSpread } from '../srs/backlog';
import { now } from '../srs/clock';
import { streak } from '../srs/day';
import { EXERCISE_COST_MS, pickExercise } from '../srs/ladder';
import { isAutomatic, unitProgress } from '../srs/mastery';
import { ModeCard } from './home/ModeCard';
import { StatCard } from './home/StatCard';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
`;

const Wrap = styled.div`
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
`;

const Hero = styled.div`
  padding: 14px 20px 8px;
`;

const HeroRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Hello = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkMute};
  letter-spacing: 1.2px;
  text-transform: uppercase;
`;

const Heading = styled.div`
  font-size: 26px;
  font-weight: 900;
  margin-top: 2px;

  span {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SettingsDot = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) => theme.shadow};
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 18px;
`;

const Body = styled.div`
  padding: 14px 20px 20px;
`;

const DailyCard = styled.div`
  background: #fff;
  border-radius: 22px;
  padding: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
  margin-bottom: 18px;
`;

const DailyTitle = styled.div`
  font-size: 20px;
  font-weight: 900;
`;

const DailySub = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 4px;
  line-height: 1.4;
`;

const Track = styled.div`
  height: 8px;
  background: #F3EBD8;
  border-radius: 99px;
  margin: 14px 0 6px;
  overflow: hidden;
`;

const Fill = styled.div<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  background: ${({ $color }) => $color};
  border-radius: 99px;
  transition: width 0.5s;
`;

const TrackMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-bottom: 14px;
`;

const UnitCard = styled.button`
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: none;
  background: #fff;
  border-radius: 22px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
  font-family: ${({ theme }) => theme.fonts.ui};
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UnitNum = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFEFE6;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 900;
  font-size: 18px;
`;

const UnitName = styled.div`
  font-size: 16px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ink};
`;

const UnitMeta = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

const Banner = styled.div<{ $tone: 'warn' | 'danger' }>`
  border-radius: 16px;
  padding: 12px 14px;
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 700;
  background: ${({ $tone, theme }) => ($tone === 'danger' ? theme.colors.dangerSoft : theme.colors.warnSoft)};
  color: ${({ $tone }) => ($tone === 'danger' ? '#9B2C2C' : '#7A5600')};
  cursor: pointer;
`;

const BACKUP_AFTER_DAYS = 14;

const Debt = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.inkSoft};

  span {
    flex: 1;
  }
`;

export function HomeScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const version = useProgressVersion();
  const updateReady = useSyncExternalStore(subscribeUpdate, isUpdateWaiting, isUpdateWaiting);

  const view = useMemo(() => {
    const settings = getSettings();
    const course = getCourse();
    const day = getDay(today());
    const plan = planDaily();
    const saved = loadSavedSession();
    let automatic = 0;
    let inReview = 0;
    for (const c of allCards()) {
      if (isAutomatic(c)) automatic++;
      if (c.state === 2 && !c.suspended) inReview++;
    }
    const unit = UNITS.find((u) => u.id === course.unlocked) ?? UNITS[0];
    // More is due than fits into a day: offer to spread it over the next days.
    const spread = plan.backlog
      ? planSpread(allCards(), now(), settings, (c) => EXERCISE_COST_MS[pickExercise(c, cardInfo(c.id))])
      : null;
    return {
      spread,
      lettersKnown: LETTERS.filter((l) => getCard(`l:${l.ch}`)?.state === 2).length,
      settings,
      day,
      plan,
      saved,
      automatic,
      inReview,
      unit,
      unitProgress: unit ? unitProgress(unit, getCard) : null,
      streakDays: streak(allDays(), today()),
    };
    // Recomputed whenever saved progress changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const { settings, day, plan, saved, unit } = view;
  const goalMs = settings.dailyMinutes * 60_000;
  const doneMin = Math.floor(day.ms / 60_000);
  const pct = Math.min(100, Math.round((day.ms / goalMs) * 100));
  const hasWork = plan.items.length > 0;
  const goalMet = day.ms >= goalMs;

  const start = () => {
    unlockAudio();
    navigate('/session', { state: { mode: 'daily' } });
  };

  const spread = view.spread && view.spread.moved.length > 0 ? view.spread : null;
  const applySpread = () => {
    if (spread) for (const c of spread.moved) putCard(c);
  };

  let sub: string;
  if (saved) sub = 'Занятие начато — можно продолжить с того же места.';
  else if (!hasWork) sub = 'На сегодня всё повторено. Новый материал откроется завтра.';
  else {
    const parts: string[] = [];
    if (plan.reviewCount) parts.push(`${plan.reviewCount} повторений`);
    const fresh = plan.newCount - plan.newLetters;
    if (fresh > 0) parts.push(`${fresh} новых`);
    if (plan.newLetters) parts.push(`букв: ${plan.newLetters}`);
    sub = parts.join(' · ') || 'Тренировка на скорость';
    if (plan.backlog) sub += '. Накопились повторения — сначала они, новое подождёт.';
  }

  const lastBackup = settings.lastBackupAt;
  const backupStale =
    cardCount() >= 40 && (!lastBackup || Date.now() - lastBackup > BACKUP_AFTER_DAYS * 86_400_000);

  return (
    <Screen>
      <Wrap>
        <Hero>
          <HeroRow>
            <div>
              <Hello>გამარჯობა · Привет</Hello>
              <Heading>
                Каркас <span>грузинского</span>
              </Heading>
            </div>
            <SettingsDot aria-label="Настройки" onClick={() => navigate('/settings')}>
              <Icon name="settings" size={20} color={theme.colors.inkSoft} />
            </SettingsDot>
          </HeroRow>

          <StatsRow role="button" aria-label="Статистика" onClick={() => navigate('/stats')}>
            <StatCard icon="flame" color={theme.colors.primary} label="дней подряд" value={view.streakDays} />
            <StatCard icon="star" color={theme.colors.success} label="на автомате" value={view.automatic} />
            <StatCard icon="cards" color={theme.colors.warn} label="к повторению" value={plan.dueCount} />
          </StatsRow>
        </Hero>

        <Body>
          {updateReady && (
            <Banner $tone="warn" onClick={applyUpdate}>
              Доступна новая версия приложения. Нажми, чтобы обновить.
            </Banner>
          )}
          {hasWriteError() && (
            <Banner $tone="danger" onClick={() => navigate('/settings')}>
              Прогресс не сохраняется на устройстве. Сделай резервную копию в настройках.
            </Banner>
          )}
          {backupStale && (
            <Banner $tone="warn" onClick={() => navigate('/settings')}>
              Давно не было резервной копии. Сохрани прогресс в файл — это одна кнопка в настройках.
            </Banner>
          )}

          <DailyCard>
            <DailyTitle>Занятие дня</DailyTitle>
            <DailySub>{sub}</DailySub>
            <Track>
              <Fill $pct={pct} $color={goalMet ? theme.colors.success : theme.colors.primary} />
            </Track>
            <TrackMeta>
              <span>
                {doneMin} из {settings.dailyMinutes} мин
              </span>
              <span>{goalMet ? 'цель выполнена' : `${pct}%`}</span>
            </TrackMeta>
            <Pill
              kind={hasWork || saved ? 'primary' : 'ghost'}
              size="lg"
              style={{ width: '100%' }}
              disabled={!hasWork && !saved}
              onClick={start}
            >
              <Icon name="play" size={18} />
              {saved ? 'Продолжить' : hasWork ? (day.ms > 0 ? 'Ещё подход' : 'Начать') : 'Готово'}
            </Pill>
            {spread && !saved && (
              <Debt>
                <span>
                  К повторению {plan.dueCount} — в один день не помещается. Можно оставить на сегодня {spread.today},
                  а остальные разложить на {spread.days} дн. вперёд.
                </span>
                <Pill kind="ghost" size="sm" onClick={applySpread}>
                  Распределить
                </Pill>
              </Debt>
            )}
          </DailyCard>

          {unit && view.unitProgress && (
            <>
              <SectionLabel>Текущий урок</SectionLabel>
              <UnitCard type="button" onClick={() => navigate(`/course/${unit.id}`)}>
                <UnitNum>{unit.id}</UnitNum>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <UnitName>{unit.titleRu}</UnitName>
                  <UnitMeta>
                    пройдено {view.unitProgress.introduced} из {view.unitProgress.total} · на автомате{' '}
                    {view.unitProgress.automatic} из {view.unitProgress.skeleton}
                  </UnitMeta>
                  <Track style={{ margin: '8px 0 0' }}>
                    <Fill $pct={Math.round(view.unitProgress.fraction * 100)} $color={theme.colors.primary} />
                  </Track>
                </div>
                <Icon name="arrow" size={20} color={theme.colors.inkMute} />
              </UnitCard>
            </>
          )}

          <SectionLabel>Разделы</SectionLabel>
          <ModeCard
            accent={theme.colors.primary}
            tint="#FFEFE6"
            icon="sparkle"
            title="Курс «Каркас»"
            subtitle="16 уроков: от матрицы глагола до связной речи"
            extra={`Открыт урок ${getCourse().unlocked}`}
            onClick={() => navigate('/course')}
          />
          <ModeCard
            accent={theme.colors.purple}
            tint={theme.colors.purpleSoft}
            icon="bulb"
            title="Глаголы и матрица"
            subtitle="Все формы глагола в трёх временах и прокрутка на скорость"
            extra="Справочник и тренировка"
            onClick={() => navigate('/verbs')}
          />
          <ModeCard
            accent={theme.colors.blue}
            tint={theme.colors.blueSoft}
            icon="cards"
            title="Карточки слов"
            subtitle="Свободная практика словаря с картинками"
            extra="836 слов · по уровням и темам"
            onClick={() => navigate('/select/flash')}
          />
          <ModeCard
            accent={theme.colors.success}
            tint={theme.colors.successSoft}
            icon="star"
            title="Статистика"
            subtitle="Занятия по дням, повторения на неделю вперёд, память"
            extra={`в повторении ${view.inReview}`}
            onClick={() => navigate('/stats')}
          />
          <ModeCard
            accent={theme.colors.gold}
            tint={theme.colors.goldSoft}
            icon="abc"
            title="Алфавит"
            subtitle="33 буквы со звуком; пары, которые легко спутать"
            extra={`выучено ${view.lettersKnown} из ${LETTERS.length}`}
            onClick={() => navigate('/alphabet')}
          />
        </Body>
      </Wrap>
    </Screen>
  );
}
