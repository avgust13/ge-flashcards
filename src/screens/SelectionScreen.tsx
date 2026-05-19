import { useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CATEGORIES, WORDS } from '../data';
import { LEVELS } from '../data/levels';
import type { CategoryId, Mode, Word } from '../types';
import { Chip } from '../components/ui/Chip';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useSession } from '../state/SessionContext';
import { shuffle } from '../utils/shuffle';
import { LevelChip } from './levels/LevelChip';
import { BrushAxis } from './selection/BrushAxis';
import { LegendDot } from './selection/LegendDot';
import { MixToggle } from './selection/MixToggle';
import { RandomDice } from './selection/RandomDice';
import { RankGraph } from './selection/RankGraph';
import { Stepper } from './selection/Stepper';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
`;

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 6px 0 12px;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 20px 6px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Block = styled.div`
  padding: 14px 20px 0;
`;

const GraphCard = styled.div`
  background: #fff;
  border-radius: 20px;
  padding: 14px 14px 8px;
  box-shadow: ${({ theme }) => theme.shadow};
`;

const RowSpaced = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const SmallMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-weight: 700;
`;

const Legend = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-weight: 700;
  padding: 0 4px;
`;

const CountCard = styled.div`
  background: #fff;
  border-radius: 20px;
  padding: 14px;
  box-shadow: ${({ theme }) => theme.shadow};
`;

const CountRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const Quick = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Footer = styled.div`
  padding: 12px 20px 14px;
  background: linear-gradient(to top, rgba(255, 248, 238, 1) 60%, rgba(255, 248, 238, 0));
`;

export function SelectionScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode: modeParam } = useParams<{ mode: string }>();
  const [searchParams] = useSearchParams();
  const mode: Mode = modeParam === 'alpha' ? 'alpha' : 'flash';
  const { startSession } = useSession();

  const levelParam = searchParams.get('level');
  const levelId =
    levelParam !== null && /^\d+$/.test(levelParam) && Number(levelParam) >= 0 && Number(levelParam) < LEVELS.length
      ? Number(levelParam)
      : null;

  const [cat, setCat] = useState<CategoryId>('all');
  const [range, setRange] = useState<[number, number]>([0, 0.6]);
  const [count, setCount] = useState(20);
  const [mix, setMix] = useState(true);

  const pool = useMemo<Word[]>(() => {
    let arr = WORDS;
    if (levelId !== null) arr = arr.filter((w) => w.level === levelId);
    if (cat !== 'all') arr = arr.filter((w) => w.cat === cat);
    return [...arr].sort((a, b) => a.correct - b.correct);
  }, [cat, levelId]);

  const catCounts = useMemo<Record<string, number>>(() => {
    const source = levelId !== null ? WORDS.filter((w) => w.level === levelId) : WORDS;
    const out: Record<string, number> = { all: source.length };
    for (const c of CATEGORIES) if (c.id !== 'all') out[c.id] = 0;
    for (const w of source) out[w.cat] = (out[w.cat] || 0) + 1;
    return out;
  }, [levelId]);

  const selected = useMemo<Word[]>(() => {
    const lo = Math.floor(range[0] * pool.length);
    const hi = Math.ceil(range[1] * pool.length);
    return pool.slice(lo, hi);
  }, [pool, range]);

  useEffect(() => {
    setCount((c) => Math.min(c, Math.max(5, selected.length)));
  }, [selected.length]);

  const startBtn = () => {
    let picks = [...selected];
    if (mix) {
      const mid = Math.floor(picks.length / 2);
      const weak = picks.slice(0, mid);
      const strong = picks.slice(mid);
      const nWeak = Math.round(count * 0.7);
      const nStrong = count - nWeak;
      picks = shuffle(weak).slice(0, nWeak).concat(shuffle(strong).slice(0, nStrong));
    } else {
      picks = shuffle(picks).slice(0, count);
    }
    picks = shuffle(picks);
    if (picks.length === 0) return;
    startSession(mode, picks);
    navigate(`/session/${mode}`);
  };

  const modeTitle = mode === 'flash' ? 'Flashcards' : 'Alphabet trainer';
  const stepMax = Math.max(5, Math.min(100, selected.length));

  return (
    <Screen>
      <ScreenHeader
        title={modeTitle}
        onBack={() => navigate(levelId !== null ? '/levels' : '/')}
      />

      <Scroll>
        <SectionLabel style={{ padding: '8px 20px 6px' }}>Level</SectionLabel>
        <ChipRow>
          <LevelChip
            label="All"
            color={theme.colors.ink}
            active={levelId === null}
            onClick={() => navigate(`/select/${mode}`)}
          />
          {LEVELS.map((L) => (
            <LevelChip
              key={L.id}
              label={`L${L.id} · ${L.name}`}
              color={L.color}
              tint={L.tint}
              active={levelId === L.id}
              onClick={() => navigate(`/select/${mode}?level=${L.id}`)}
            />
          ))}
        </ChipRow>

        <SectionLabel style={{ padding: '8px 20px 6px' }}>Category</SectionLabel>
        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={cat === c.id}
              onClick={() => setCat(c.id)}
              count={catCounts[c.id] || 0}
            >
              <span style={{ fontSize: 13 }}>{c.emoji}</span>
              <span>{c.ru}</span>
            </Chip>
          ))}
        </ChipRow>

        <Block>
          <RowSpaced>
            <SectionLabel style={{ margin: 0 }}>Mastery curve</SectionLabel>
            <SmallMeta>
              {selected.length} of {pool.length} words selected
            </SmallMeta>
          </RowSpaced>

          <GraphCard>
            <RankGraph words={pool} range={range} onRange={setRange} />
            <BrushAxis range={range} pool={pool} />
          </GraphCard>

          <Legend>
            <LegendDot color={theme.colors.danger}>Struggle</LegendDot>
            <LegendDot color={theme.colors.warn}>Learning</LegendDot>
            <LegendDot color={theme.colors.success}>Mastered</LegendDot>
          </Legend>
        </Block>

        <Block style={{ paddingTop: 18 }}>
          <SectionLabel>How many today?</SectionLabel>
          <CountCard>
            <CountRow>
              <Stepper value={count} setValue={setCount} min={5} max={stepMax} step={5} />
              <RandomDice
                onClick={() => {
                  const max = Math.min(100, Math.max(5, selected.length));
                  const span = Math.max(0, max - 5);
                  const next = span === 0 ? 5 : 5 + Math.floor((Math.random() * span) / 5) * 5;
                  setCount(next || 20);
                }}
              />
            </CountRow>
            <Quick>
              {[10, 20, 30, 50]
                .filter((n) => n <= selected.length)
                .map((n) => (
                  <Pill
                    key={n}
                    size="sm"
                    kind={count === n ? 'dark' : 'ghost'}
                    onClick={() => setCount(n)}
                    style={{ height: 32 }}
                  >
                    {n}
                  </Pill>
                ))}
            </Quick>
            <MixToggle on={mix} onToggle={() => setMix(!mix)} />
          </CountCard>
        </Block>
      </Scroll>

      <Footer>
        <Pill
          kind="primary"
          size="lg"
          onClick={startBtn}
          style={{ width: '100%' }}
          disabled={selected.length === 0}
        >
          <Icon name="play" size={18} />
          <span>
            Start {count} {mode === 'flash' ? 'cards' : 'rounds'}
          </span>
        </Pill>
      </Footer>
    </Screen>
  );
}
