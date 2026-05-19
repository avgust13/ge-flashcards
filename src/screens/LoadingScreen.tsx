import styled from 'styled-components';
import { ProgressBar } from '../components/ui/ProgressBar';

interface Props {
  loaded: number;
  total: number;
  error: string | null;
}

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
  padding: 0 32px;
  gap: 18px;
`;

const Hello = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkMute};
  letter-spacing: 1.2px;
  text-transform: uppercase;
`;

const Heading = styled.div`
  font-size: 24px;
  font-weight: 900;
  text-align: center;
  span {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const BarRow = styled.div`
  display: flex;
  width: 100%;
  max-width: 320px;
  align-items: center;
`;

const Meta = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const ErrorBox = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.danger};
  text-align: center;
`;

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LoadingScreen({ loaded, total, error }: Props) {
  const value = total > 0 ? loaded / total : 0;
  const pct = Math.round(value * 100);

  return (
    <Screen>
      <Hello>გამარჯობა · Привет</Hello>
      <Heading>
        Preparing your <span>flashcards</span>
      </Heading>

      {error ? (
        <ErrorBox>{error}</ErrorBox>
      ) : (
        <>
          <BarRow>
            <ProgressBar value={value} />
          </BarRow>
          <Meta>
            {total > 0
              ? `${formatMB(loaded)} of ${formatMB(total)} · ${pct}%`
              : 'Starting download…'}
          </Meta>
        </>
      )}
    </Screen>
  );
}
