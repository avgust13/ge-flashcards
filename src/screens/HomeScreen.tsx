import styled, { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { SectionLabel } from '../components/ui/SectionLabel';
import { StatCard } from './home/StatCard';
import { ModeCard } from './home/ModeCard';
import { useWordsLoad } from '../state/WordsContext';
import { WORDS } from '../data';
import { LEVELS, globalStats, levelStats } from '../data/levels';
import { DAILY_GOAL, getDailyCount } from '../data/stats';
import type { Mode } from '../types';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
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
  padding: 14px 20px 0;
  flex: 1;
`;

const GoalCard = styled.div`
  background: #fff;
  border-radius: 18px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
`;

const JourneyCard = styled.button`
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: none;
  background: #fff;
  border-radius: 22px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
  font-family: ${({ theme }) => theme.fonts.ui};
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;
`;

const JourneyStripe = styled.div<{ $gradient: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${({ $gradient }) => $gradient};
`;

const JourneyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const JourneyMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

const JourneyEyebrow = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.inkMute};
  letter-spacing: 1.2px;
  text-transform: uppercase;
`;

const JourneyName = styled.div`
  font-size: 16px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ink};
`;

const JourneyArrow = styled.div`
  color: ${({ theme }) => theme.colors.inkMute};
  display: flex;
  align-items: center;
`;

const SegmentBar = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 12px;
`;

const Segment = styled.div`
  flex: 1;
  height: 10px;
  border-radius: 99px;
  background: #F3EBD8;
  position: relative;
  overflow: hidden;
`;

const SegmentFill = styled.div<{ $color: string; $pct: number }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  background: ${({ $color }) => $color};
  border-radius: 99px;
  transition: width 0.5s;
`;

const JourneyFooter = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const JourneyPct = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-weight: 900;
`;

const GoalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const GoalTitle = styled.div`
  font-weight: 800;
  font-size: 15px;
`;

const GoalCount = styled.div`
  font-weight: 800;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const GoalTrack = styled.div`
  height: 8px;
  background: #F3EBD8;
  border-radius: 99px;
  margin-top: 10px;
  overflow: hidden;
`;

const GoalFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  background: ${({ theme }) => theme.colors.success};
  border-radius: 99px;
  transition: width 0.5s;
`;

const Spacer = styled.div`
  height: 16px;
`;

export function HomeScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { wordCount } = useWordsLoad();

  const journeyStats = LEVELS.map((l) => levelStats(l.id, WORDS));
  const totals = journeyStats.reduce(
    (acc, s) => ({ mastered: acc.mastered + s.mastered, total: acc.total + s.total }),
    { mastered: 0, total: 0 },
  );
  const totalPct = totals.total === 0 ? 0 : Math.round((totals.mastered / totals.total) * 100);
  const g = globalStats(WORDS);

  const dailyDone = getDailyCount();
  const dailyPct = Math.min(100, Math.round((dailyDone / DAILY_GOAL) * 100));

  const onPick = (mode: Mode) => navigate(`/select/${mode}`);

  return (
    <Screen>
      <Hero>
        <HeroRow>
          <div>
            <Hello>გამარჯობა · Привет</Hello>
            <Heading>
              Let's learn <span>Georgian</span>
            </Heading>
          </div>
          <SettingsDot aria-label="Settings" onClick={() => navigate('/settings')}>
            <Icon name="settings" size={20} color={theme.colors.inkSoft} />
          </SettingsDot>
        </HeroRow>

        <StatsRow>
          <StatCard icon="cards" color={theme.colors.primary} label="Explored" value={g.explored} />
          <StatCard icon="check" color={theme.colors.success} label="Mastered" value={g.mastered} />
          <StatCard icon="bulb" color={theme.colors.warn} label="Learning" value={g.learning} />
        </StatsRow>
      </Hero>

      <Body>
        <SectionLabel>Today's goal</SectionLabel>
        <GoalCard>
          <GoalRow>
            <GoalTitle>Go through {DAILY_GOAL} cards</GoalTitle>
            <GoalCount>
              {Math.min(dailyDone, DAILY_GOAL)} / {DAILY_GOAL}
            </GoalCount>
          </GoalRow>
          <GoalTrack>
            <GoalFill $pct={dailyPct} />
          </GoalTrack>
        </GoalCard>

        <SectionLabel style={{ marginTop: 18 }}>Practice</SectionLabel>

        <ModeCard
          accent={theme.colors.primary}
          tint="#FFEFE6"
          icon="cards"
          title="Flashcards"
          subtitle="Swipe right if you know it, left if you don't"
          extra={`${wordCount} words · KA → RU`}
          onClick={() => onPick('flash')}
        />
        <ModeCard
          accent={theme.colors.blue}
          tint={theme.colors.blueSoft}
          icon="abc"
          title="Alphabet trainer"
          subtitle="Match each Georgian letter to its Russian sound"
          extra="33 letters · Mkhedruli"
          onClick={() => onPick('alpha')}
        />

        <SectionLabel style={{ marginTop: 18 }}>Your journey</SectionLabel>
        <JourneyCard type="button" onClick={() => navigate('/levels')}>
          <JourneyStripe
            $gradient={`linear-gradient(to right, ${LEVELS.map((l) => l.color).join(', ')})`}
          />
          <JourneyRow>
            <JourneyMeta>
              <JourneyEyebrow>Overall progress</JourneyEyebrow>
              <JourneyName>Your journey</JourneyName>
            </JourneyMeta>
            <JourneyArrow>
              <Icon name="arrow" size={20} />
            </JourneyArrow>
          </JourneyRow>

          <SegmentBar>
            {LEVELS.map((L) => (
              <Segment key={L.id}>
                <SegmentFill $color={L.color} $pct={journeyStats[L.id].progress * 100} />
              </Segment>
            ))}
          </SegmentBar>

          <JourneyFooter>
            <span>
              {totals.mastered} of {totals.total} mastered
            </span>
            <JourneyPct $color={theme.colors.primary}>{totalPct}%</JourneyPct>
          </JourneyFooter>
        </JourneyCard>

      </Body>

      <Spacer />
    </Screen>
  );
}
