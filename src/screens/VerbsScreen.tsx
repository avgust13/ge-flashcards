import styled, { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { VERBS } from '../content/store';
import { PERSONS, TENSES } from '../content/types';
import { getCard } from '../db/progress';
import { useProgressVersion } from '../db/useProgress';
import { isAutomatic } from '../srs/mastery';

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
  padding: 4px 20px 20px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
`;

const Intro = styled.div`
  font-size: 14px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-bottom: 14px;
`;

const Row = styled.button`
  width: 100%;
  text-align: left;
  border: none;
  cursor: pointer;
  background: #fff;
  border-radius: 18px;
  padding: 14px 16px;
  margin-bottom: 10px;
  box-shadow: ${({ theme }) => theme.shadow};
  font-family: ${({ theme }) => theme.fonts.ui};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Ka = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 20px;
  color: ${({ theme }) => theme.colors.ink};
`;

const Ru = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Count = styled.div<{ $color: string }>`
  font-size: 12px;
  font-weight: 900;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  text-align: right;

  span {
    display: block;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.inkMute};
  }
`;

/** Every verb of the skeleton, with how much of its matrix is already learned. */
export function VerbsScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  useProgressVersion();

  return (
    <Screen>
      <ScreenHeader title="Глаголы и матрица" onBack={() => navigate('/')} />
      <List>
        <Intro>
          Глагол — основа каркаса. У каждого три строки (будущее, настоящее, прошедшее) и шесть лиц. Все
          формы проверены по таблицам спряжения.
        </Intro>
        {VERBS.map((v) => {
          let learned = 0;
          let auto = 0;
          for (const t of TENSES) {
            for (const p of PERSONS) {
              const c = getCard(`c:${v.id}.${t}.${p}`);
              if (c) learned++;
              if (isAutomatic(c)) auto++;
            }
          }
          return (
            <Row key={v.id} type="button" onClick={() => navigate(`/verbs/${v.id}`)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Ka>{v.forms.prs['1sg']}</Ka>
                <Ru>{v.ru}</Ru>
              </div>
              <Count $color={learned ? theme.colors.primary : theme.colors.inkMute}>
                {learned} из 18
                <span>на автомате {auto}</span>
              </Count>
              <Icon name="arrow" size={18} color={theme.colors.inkMute} />
            </Row>
          );
        })}
      </List>
    </Screen>
  );
}
