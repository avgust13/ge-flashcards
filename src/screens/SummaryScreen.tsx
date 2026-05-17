import { useEffect, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { useSession } from '../state/SessionContext';
import { isFlashResult, type AlphaResult } from '../types';
import { ResultRow } from './summary/ResultRow';
import { ScoreRing } from './summary/ScoreRing';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  overflow: auto;
  min-height: 100dvh;
`;

const Hero = styled.div`
  padding: 32px 20px 18px;
  text-align: center;
`;

const Badge = styled.div<{ $accent: string }>`
  width: 96px;
  height: 96px;
  border-radius: 48px;
  margin: 0 auto;
  background: ${({ $accent }) => $accent + '1F'};
  color: ${({ $accent }) => $accent};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 8px ${({ $accent }) => $accent + '11'};
`;

const HeadKa = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-size: 26px;
  font-weight: 700;
  margin-top: 14px;
`;

const HeadRu = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 22px;
  padding: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  align-items: center;
  gap: 18px;
`;

const CardBody = styled.div`
  flex: 1;
`;

const CardTag = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.inkMute};
  letter-spacing: 1.2px;
  text-transform: uppercase;
`;

const CardValue = styled.div`
  font-size: 30px;
  font-weight: 900;

  span {
    color: ${({ theme }) => theme.colors.inkMute};
    font-size: 18px;
    font-weight: 800;
  }
`;

const CardSub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.inkMute};
  margin-bottom: 8px;
`;

const ListWrap = styled.div`
  background: #fff;
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
  overflow: hidden;
`;

const More = styled.div`
  text-align: center;
  padding: 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
  border-top: 1px solid ${({ theme }) => theme.colors.line};
  font-weight: 700;
`;

const CTAs = styled.div`
  padding: 16px 20px 16px;
  display: flex;
  gap: 10px;
`;

export function SummaryScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, results } = useSession();

  useEffect(() => {
    if (results.length === 0) {
      navigate('/', { replace: true });
    }
  }, [results.length, navigate]);

  const isFlash = mode === 'flash';

  const { right, hints } = useMemo(() => {
    if (results.length === 0) return { right: 0, hints: 0 };
    const r = isFlash
      ? results.filter((x) => isFlashResult(x) && x.right).length
      : results.filter((x) => !isFlashResult(x) && (x as AlphaResult).perfect).length;
    const h = isFlash
      ? 0
      : results.reduce(
          (s, x) => s + (!isFlashResult(x) ? (x as AlphaResult).hints || 0 : 0),
          0,
        );
    return { right: r, hints: h };
  }, [results, isFlash]);

  if (results.length === 0) return null;

  const total = Math.max(1, results.length);
  const pct = Math.round((right / total) * 100);
  const accent =
    pct >= 80 ? theme.colors.success : pct >= 50 ? theme.colors.warn : theme.colors.danger;
  const headline =
    pct >= 80 ? 'შესანიშნავია!' : pct >= 50 ? 'კარგი მუშაობა' : 'ვარჯიში გრძელდება';
  const headlineRu =
    pct >= 80 ? 'Превосходно!' : pct >= 50 ? 'Хорошая работа' : 'Тренировка продолжается';

  const onAgain = () => navigate(`/select/${mode}`);
  const onHome = () => navigate('/');

  return (
    <Screen>
      <Hero>
        <Badge $accent={accent}>
          <Icon name={pct >= 80 ? 'star' : pct >= 50 ? 'check' : 'flame'} size={48} stroke={2.4} />
        </Badge>
        <HeadKa>{headline}</HeadKa>
        <HeadRu>{headlineRu}</HeadRu>
      </Hero>

      <div style={{ padding: '0 20px' }}>
        <Card>
          <ScoreRing value={pct / 100} color={accent} />
          <CardBody>
            <CardTag>{isFlash ? 'Knew it' : 'Perfect'}</CardTag>
            <CardValue>
              {right} <span>/ {total}</span>
            </CardValue>
            {!isFlash && (
              <CardSub>
                <Icon name="bulb" size={12} /> {hints} hints used
              </CardSub>
            )}
          </CardBody>
        </Card>
      </div>

      <div style={{ padding: '14px 20px 0', flex: 1 }}>
        <SectionTitle>Words this round</SectionTitle>
        <ListWrap>
          {results.slice(0, 8).map((r, idx) => (
            <ResultRow
              key={idx}
              r={r}
              mode={mode}
              last={idx === Math.min(7, results.length - 1)}
            />
          ))}
          {results.length > 8 && <More>+ {results.length - 8} more</More>}
        </ListWrap>
      </div>

      <CTAs>
        <Pill kind="ghost" size="lg" onClick={onHome} style={{ flex: 1 }}>
          Home
        </Pill>
        <Pill kind="primary" size="lg" onClick={onAgain} style={{ flex: 1.4 }}>
          <Icon name="refresh" size={16} />
          Practice again
        </Pill>
      </CTAs>
    </Screen>
  );
}
