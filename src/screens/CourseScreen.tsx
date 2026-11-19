import styled, { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { UNITS } from '../content/store';
import { getCard, getCourse } from '../db/progress';
import { useProgressVersion } from '../db/useProgress';
import { unitProgress } from '../srs/mastery';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
`;

const List = styled.div`
  padding: 4px 16px 20px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
`;

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40px;
  flex-shrink: 0;
`;

const Dot = styled.div<{ $state: 'done' | 'open' | 'locked' | 'soon' }>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 15px;
  color: ${({ $state, theme }) => ($state === 'locked' || $state === 'soon' ? theme.colors.inkMute : '#fff')};
  background: ${({ $state, theme }) =>
    $state === 'done' ? theme.colors.success : $state === 'open' ? theme.colors.primary : '#F3EBD8'};
`;

const Line = styled.div`
  flex: 1;
  width: 3px;
  background: #F3EBD8;
  border-radius: 2px;
  margin: 4px 0;
  min-height: 12px;
`;

const Card = styled.button<{ $dim: boolean }>`
  flex: 1;
  min-width: 0;
  text-align: left;
  border: none;
  background: #fff;
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: ${({ theme }) => theme.shadow};
  font-family: ${({ theme }) => theme.fonts.ui};
  cursor: ${({ $dim }) => ($dim ? 'default' : 'pointer')};
  opacity: ${({ $dim }) => ($dim ? 0.55 : 1)};
`;

const Name = styled.div`
  font-size: 16px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Goal = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 3px;
  line-height: 1.35;
`;

const Track = styled.div`
  height: 6px;
  background: #F3EBD8;
  border-radius: 99px;
  margin-top: 10px;
  overflow: hidden;
`;

const Fill = styled.div<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  background: ${({ $color }) => $color};
  border-radius: 99px;
`;

const Tag = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.inkMute};
  white-space: nowrap;
`;

/** The 16-unit path. Units open one by one as the previous one becomes automatic. */
export function CourseScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  useProgressVersion();
  const { unlocked } = getCourse();

  return (
    <Screen>
      <ScreenHeader title="Курс «Каркас»" onBack={() => navigate('/')} />
      <List>
        {UNITS.map((u, idx) => {
          const p = unitProgress(u, getCard);
          const state = !u.ready ? 'soon' : u.id > unlocked ? 'locked' : p.gateMet ? 'done' : 'open';
          const clickable = u.ready;
          return (
            <Row key={u.id}>
              <Rail>
                <Dot $state={state}>{state === 'done' ? <Icon name="check" size={18} stroke={2.6} /> : u.id}</Dot>
                {idx < UNITS.length - 1 && <Line />}
              </Rail>
              <Card
                type="button"
                $dim={!clickable}
                disabled={!clickable}
                onClick={() => navigate(`/course/${u.id}`)}
              >
                <Name>
                  {u.titleRu}
                  {state === 'soon' && <Tag>скоро</Tag>}
                  {state === 'locked' && <Tag>закрыт</Tag>}
                </Name>
                <Goal>{u.goalRu}</Goal>
                {u.ready && (
                  <Track>
                    <Fill
                      $pct={Math.round(p.fraction * 100)}
                      $color={p.gateMet ? theme.colors.success : theme.colors.primary}
                    />
                  </Track>
                )}
              </Card>
            </Row>
          );
        })}
      </List>
    </Screen>
  );
}
