import { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Icon } from '../components/ui/Icon';
import { WORDS } from '../data';
import { LEVELS, levelStats } from '../data/levels';
import { JourneyRing } from './levels/JourneyRing';
import { LevelNode } from './levels/LevelNode';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
`;

const SummaryWrap = styled.div`
  padding: 4px 20px 12px;
`;

const SummaryCard = styled.div`
  background: #fff;
  border-radius: 22px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  align-items: center;
  gap: 14px;
`;

const SummaryText = styled.div`
  flex: 1;
  min-width: 0;
`;

const Eyebrow = styled.div`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.inkMute};
`;

const MasteredLine = styled.div`
  font-size: 18px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ink};
  margin-top: 2px;
`;

const Path = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 16px 16px;
  position: relative;
`;

const EndMarker = styled.div`
  text-align: center;
  padding: 8px 0 12px;
  color: ${({ theme }) => theme.colors.inkMute};
`;

const Star = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  margin: 0 auto;
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.inkMute};
`;

const EndLabel = styled.div`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  margin-top: 6px;
  text-transform: uppercase;
`;

export function LevelsScreen() {
  const navigate = useNavigate();
  const theme = useTheme();

  const stats = useMemo(() => LEVELS.map((l) => levelStats(l.id, WORDS)), []);

  const totals = useMemo(() => {
    let mastered = 0;
    let total = 0;
    for (const s of stats) {
      mastered += s.mastered;
      total += s.total;
    }
    return { mastered, total };
  }, [stats]);

  return (
    <Screen>
      <ScreenHeader title="Your journey" onBack={() => navigate('/')} />

      <SummaryWrap>
        <SummaryCard>
          <JourneyRing steps={5} mastered={totals.mastered} total={totals.total} />
          <SummaryText>
            <Eyebrow>Your journey</Eyebrow>
            <MasteredLine>
              {totals.mastered} / {totals.total} words mastered
            </MasteredLine>
          </SummaryText>
        </SummaryCard>
      </SummaryWrap>

      <Path>
        {LEVELS.map((L, idx) => (
          <LevelNode
            key={L.id}
            level={L}
            stats={stats[L.id]}
            isLast={idx === LEVELS.length - 1}
            onPick={() => navigate(`/select/flash?level=${L.id}`)}
          />
        ))}
      </Path>
    </Screen>
  );
}
