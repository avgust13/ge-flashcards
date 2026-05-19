import styled, { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { SectionLabel } from '../components/ui/SectionLabel';
import { StatCard } from './home/StatCard';
import { ModeCard } from './home/ModeCard';
import { useWordsLoad } from '../state/WordsContext';
import type { Mode } from '../types';

const stats = { streak: 12, mastered: 184, learning: 47 };

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
  padding: 24px 20px 8px;
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

const GoalFill = styled.div`
  width: 60%;
  height: 100%;
  background: ${({ theme }) => theme.colors.success};
  border-radius: 99px;
`;

const Spacer = styled.div`
  height: 16px;
`;

export function HomeScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { wordCount } = useWordsLoad();

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
          <StatCard icon="flame" color={theme.colors.primary} label="Day streak" value={stats.streak} />
          <StatCard icon="check" color={theme.colors.success} label="Mastered" value={stats.mastered} />
          <StatCard icon="bulb" color={theme.colors.warn} label="Learning" value={stats.learning} />
        </StatsRow>
      </Hero>

      <Body>
        <SectionLabel>Practice</SectionLabel>

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

        <SectionLabel style={{ marginTop: 18 }}>Today's goal</SectionLabel>
        <GoalCard>
          <GoalRow>
            <GoalTitle>Review 20 weak words</GoalTitle>
            <GoalCount>12 / 20</GoalCount>
          </GoalRow>
          <GoalTrack>
            <GoalFill />
          </GoalTrack>
        </GoalCard>
      </Body>

      <Spacer />
    </Screen>
  );
}
