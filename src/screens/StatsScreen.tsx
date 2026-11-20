import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionLabel } from '../components/ui/SectionLabel';
import { allCards, allDays, getSettings, logsSince, today } from '../db/progress';
import { useProgressVersion } from '../db/useProgress';
import { now } from '../srs/clock';
import { prevDayKey, streak } from '../srs/day';
import { retention, summarise, type Retention } from '../srs/stats';

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
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const TileValue = styled.div`
  font-size: 30px;
  font-weight: 900;
  line-height: 1.1;
`;

const TileLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

const ChartTitle = styled.div`
  font-size: 15px;
  font-weight: 800;
`;

const Readout = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
  min-height: 18px;
  margin-top: 2px;
`;

const Plot = styled.div`
  position: relative;
  height: 120px;
  margin-top: 14px;
  display: flex;
  align-items: stretch;
  gap: 2px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
`;

/** The whole column is the tap target, not just the bar. */
const Column = styled.button`
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
`;

const Bar = styled.div<{ $h: number; $color: string; $dim: boolean }>`
  width: 100%;
  max-width: 22px;
  height: ${({ $h }) => $h}%;
  min-height: ${({ $h }) => ($h > 0 ? 3 : 0)}px;
  background: ${({ $color }) => $color};
  opacity: ${({ $dim }) => ($dim ? 0.4 : 1)};
  border-radius: 4px 4px 0 0;
  transition: opacity 0.15s;
`;

const GoalLine = styled.div<{ $bottom: number }>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: ${({ $bottom }) => $bottom}%;
  border-top: 1px dashed ${({ theme }) => theme.colors.inkMute};
  pointer-events: none;
`;

const GoalText = styled.span`
  position: absolute;
  right: 0;
  top: -16px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkMute};
`;

const Axis = styled.div`
  display: flex;
  gap: 2px;
  margin-top: 4px;
`;

const Tick = styled.div<{ $on: boolean }>`
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 10px;
  font-weight: ${({ $on }) => ($on ? 900 : 700)};
  color: ${({ $on, theme }) => ($on ? theme.colors.ink : theme.colors.inkMute)};
`;

const Lines = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Line = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 15px;
  font-weight: 700;

  span:last-child {
    font-weight: 900;
  }
`;

const Para = styled.div`
  font-size: 14px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

interface Point {
  key: string;
  label: string;
  value: number;
  /** Full sentence for the readout under the title and for screen readers. */
  detail: string;
}

interface BarsProps {
  title: string;
  points: Point[];
  color: string;
  /** Preselected column (today). */
  initial: number;
  goal?: { value: number; label: string };
}

/** One series of bars. Tapping a column shows its exact numbers above the plot. */
function Bars({ title, points, color, initial, goal }: BarsProps) {
  const [sel, setSel] = useState(initial);
  const max = Math.max(1, goal?.value ?? 0, ...points.map((p) => p.value));
  return (
    <Card>
      <ChartTitle>{title}</ChartTitle>
      <Readout aria-live="polite">{points[sel]?.detail}</Readout>
      <Plot>
        {points.map((p, i) => (
          <Column key={p.key} type="button" aria-label={p.detail} aria-pressed={i === sel} onClick={() => setSel(i)}>
            <Bar $h={(p.value / max) * 100} $color={color} $dim={i !== sel} />
          </Column>
        ))}
        {goal && goal.value > 0 && (
          <GoalLine $bottom={(goal.value / max) * 100}>
            <GoalText>{goal.label}</GoalText>
          </GoalLine>
        )}
      </Plot>
      <Axis aria-hidden>
        {points.map((p, i) => (
          <Tick key={p.key} $on={i === sel}>
            {p.label}
          </Tick>
        ))}
      </Axis>
    </Card>
  );
}

const plural = (n: number, one: string, few: string, many: string): string => {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
};

const dateRu = (key: string): string => `${key.slice(8, 10)}.${key.slice(5, 7)}`;

export function StatsScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const version = useProgressVersion();
  const settings = getSettings();
  const [memory, setMemory] = useState<Retention | null>(null);

  const view = useMemo(() => {
    return {
      summary: summarise(allCards(), allDays(), now(), settings.dayStartHour),
      streakDays: streak(allDays(), today()),
    };
    // Recomputed whenever saved progress changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  useEffect(() => {
    let alive = true;
    let from = today();
    for (let i = 0; i < 30; i++) from = prevDayKey(from);
    void logsSince(from).then((logs) => {
      if (alive) setMemory(retention(logs));
    });
    return () => {
      alive = false;
    };
  }, [version]);

  const { summary: s } = view;
  const activity: Point[] = s.activity.map((d) => ({
    key: d.day,
    label: d.label,
    value: d.minutes,
    detail:
      d.reviews > 0
        ? `${d.label}, ${dateRu(d.day)} — ${d.minutes} мин · ${d.reviews} ${plural(d.reviews, 'ответ', 'ответа', 'ответов')}` +
          (d.newCards ? ` · новых: ${d.newCards}` : '')
        : `${d.label}, ${dateRu(d.day)} — без занятия`,
  }));
  const forecast: Point[] = s.forecast.map((f) => ({
    key: String(f.offset),
    label: f.offset === 0 ? 'сег' : f.label,
    value: f.count,
    detail: `${f.offset === 0 ? 'Сегодня' : f.offset === 1 ? 'Завтра' : `Через ${f.offset} дн.`} — ${f.count} ${plural(f.count, 'повторение', 'повторения', 'повторений')}`,
  }));

  return (
    <Screen>
      <ScreenHeader title="Статистика" onBack={() => navigate('/')} />
      <Body>
        <Tiles>
          <Card>
            <TileValue>{view.streakDays}</TileValue>
            <TileLabel>{plural(view.streakDays, 'день подряд', 'дня подряд', 'дней подряд')}</TileLabel>
          </Card>
          <Card>
            <TileValue>{s.automatic}</TileValue>
            <TileLabel>на автомате</TileLabel>
          </Card>
          <Card>
            <TileValue>{s.review}</TileValue>
            <TileLabel>в повторении</TileLabel>
          </Card>
          <Card>
            <TileValue>{s.totalMinutes}</TileValue>
            <TileLabel>{plural(s.totalMinutes, 'минута всего', 'минуты всего', 'минут всего')}</TileLabel>
          </Card>
        </Tiles>

        <SectionLabel>Занятия</SectionLabel>
        <Bars
          title="Минуты за последние 14 дней"
          points={activity}
          color={theme.colors.primary}
          initial={activity.length - 1}
          goal={{ value: settings.dailyMinutes, label: `цель ${settings.dailyMinutes} мин` }}
        />
        <Bars title="Повторения на ближайшую неделю" points={forecast} color={theme.colors.blue} initial={0} />

        <SectionLabel>Память</SectionLabel>
        <Card>
          {memory?.rate != null ? (
            <>
              <TileValue>{Math.round(memory.rate * 100)}%</TileValue>
              <TileLabel>повторений вспомнено за 30 дней</TileLabel>
              <Para style={{ marginTop: 10 }}>
                Из {memory.n} {plural(memory.n, 'повторения', 'повторений', 'повторений')} выученных карточек. Планировщик
                подбирает интервалы так, чтобы вспоминалось около 90%: ниже — карточки приходят слишком редко, заметно
                выше — можно было бы реже.
              </Para>
            </>
          ) : (
            <Para>
              Доля вспомненного появится, когда наберётся хотя бы 20 повторений уже выученных карточек
              {memory ? ` (сейчас ${memory.n})` : ''}.
            </Para>
          )}
        </Card>

        <SectionLabel>Что выучено</SectionLabel>
        <Card>
          <Lines>
            <Line>
              <span>Формы глаголов и схемы</span>
              <span>{s.byKind.c}</span>
            </Line>
            <Line>
              <span>Слова</span>
              <span>{s.byKind.w}</span>
            </Line>
            <Line>
              <span>Готовые фразы</span>
              <span>{s.byKind.s}</span>
            </Line>
            <Line>
              <span>Буквы</span>
              <span>{s.byKind.l}</span>
            </Line>
            <Line>
              <span>Ещё заучиваются</span>
              <span>{s.learning}</span>
            </Line>
            <Line>
              <span>Помнятся дольше трёх недель</span>
              <span>{s.mature}</span>
            </Line>
            {s.suspended > 0 && (
              <Line>
                <span>Скрыто из-за замечаний</span>
                <span>{s.suspended}</span>
              </Line>
            )}
          </Lines>
        </Card>
        <Para>
          Всего занятий: {s.studyDays} {plural(s.studyDays, 'день', 'дня', 'дней')}, ответов: {s.totalReviews}.
        </Para>
      </Body>
    </Screen>
  );
}
