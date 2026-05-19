import styled from 'styled-components';
import type { Level, LevelStats } from '../../data/levels';
import { LockIcon } from './LockIcon';

interface Props {
  level: Level;
  stats: LevelStats;
  unlocked: boolean;
  active: boolean;
  isLast: boolean;
  onPick: () => void;
}

const Row = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;
  padding-left: 4px;
`;

const Rail = styled.div`
  position: relative;
  width: 36px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Dot = styled.div<{ $color: string; $dim: boolean; $active: boolean; $line: string }>`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  margin-top: 14px;
  z-index: 1;
  background: ${({ $color, $dim }) => ($dim ? '#F3EBD8' : $color)};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 900;
  font-size: 15px;
  box-shadow: ${({ $active, $color, $line }) =>
    $active ? `0 0 0 6px ${$color}33` : `0 2px 0 ${$line}`};
  opacity: ${({ $dim }) => ($dim ? 0.6 : 1)};
`;

const Connector = styled.div<{ $color: string; $line: string; $dim: boolean }>`
  flex: 1;
  width: 3px;
  margin-top: -2px;
  background: ${({ $color, $line, $dim }) =>
    `repeating-linear-gradient(to bottom, ${$dim ? $line : $color}55 0 4px, transparent 4px 8px)`};
`;

const Card = styled.button<{ $color: string; $dim: boolean; $active: boolean }>`
  flex: 1;
  text-align: left;
  cursor: ${({ $dim }) => ($dim ? 'default' : 'pointer')};
  border: none;
  background: #fff;
  border-radius: 20px;
  padding: 14px;
  margin: 8px 0;
  box-shadow: ${({ theme }) => theme.shadow};
  font-family: ${({ theme }) => theme.fonts.ui};
  opacity: ${({ $dim }) => ($dim ? 0.55 : 1)};
  position: relative;
  outline: ${({ $active, $color }) => ($active ? `2px solid ${$color}` : 'none')};
  outline-offset: ${({ $active }) => ($active ? '-2px' : '0')};
`;

const HereTag = styled.div<{ $color: string }>`
  position: absolute;
  top: -8px;
  right: 12px;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 99px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

const Name = styled.div`
  font-size: 17px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ink};
`;

const RangePill = styled.div<{ $color: string; $tint: string }>`
  font-size: 11px;
  font-weight: 800;
  color: ${({ $color }) => $color};
  background: ${({ $tint }) => $tint};
  padding: 2px 8px;
  border-radius: 99px;
`;

const Sub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 1px;
`;

const ThemeChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 10px 0;
`;

const ThemeChip = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
  background: #FAF5EA;
  padding: 3px 7px;
  border-radius: 99px;
  border: 1px solid ${({ theme }) => theme.colors.line};
`;

const MoreChip = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkMute};
  padding: 3px 4px;
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Track = styled.div`
  flex: 1;
  height: 8px;
  background: #F3EBD8;
  border-radius: 99px;
  overflow: hidden;
`;

const Fill = styled.div<{ $color: string; $pct: number }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  background: ${({ $color }) => $color};
  border-radius: 99px;
`;

const Counts = styled.div<{ $color: string }>`
  font-size: 12px;
  font-weight: 900;
  color: ${({ $color }) => $color};
  font-variant-numeric: tabular-nums;
  min-width: 44px;
  text-align: right;
`;

const Goal = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1.3;
`;

const GoalMark = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const GoalText = styled.span`
  font-style: italic;
`;

export function LevelNode({ level, stats, unlocked, active, isLast, onPick }: Props) {
  const dim = !unlocked;
  const themesShown = level.themes.slice(0, 6);
  const extraThemes = level.themes.length - 6;
  return (
    <Row>
      <Rail>
        <Dot $color={level.color} $dim={dim} $active={active} $line="#ECE2CC">
          {dim ? <LockIcon /> : `L${level.id}`}
        </Dot>
        {!isLast && <Connector $color={level.color} $line="#ECE2CC" $dim={dim} />}
      </Rail>

      <Card
        type="button"
        onClick={onPick}
        disabled={dim}
        $color={level.color}
        $dim={dim}
        $active={active}
      >
        {active && <HereTag $color={level.color}>You are here</HereTag>}

        <HeaderRow>
          <Name>{level.name}</Name>
          <RangePill $color={level.color} $tint={level.tint}>
            {level.range[0]}–{level.range[1]}
          </RangePill>
        </HeaderRow>
        <Sub>{level.ru}</Sub>

        <ThemeChips>
          {themesShown.map((t) => (
            <ThemeChip key={t}>{t}</ThemeChip>
          ))}
          {extraThemes > 0 && <MoreChip>+{extraThemes}</MoreChip>}
        </ThemeChips>

        <ProgressRow>
          <Track>
            <Fill $color={level.color} $pct={stats.progress * 100} />
          </Track>
          <Counts $color={level.color}>
            {stats.mastered}/{stats.total}
          </Counts>
        </ProgressRow>

        <Goal>
          <GoalMark $color={level.color}>▸</GoalMark>
          <GoalText>{level.goal}</GoalText>
        </Goal>
      </Card>
    </Row>
  );
}
