import styled from 'styled-components';
import { Pill } from '../components/ui/Pill';

interface Props {
  error: string | null;
  onRetry?: () => void;
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

const ErrorBox = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.danger};
  text-align: center;
`;

/** Shown for the moment the picture dictionary (a small text file) is being fetched. */
export function LoadingScreen({ error, onRetry }: Props) {
  return (
    <Screen>
      <Hello>გამარჯობა · Привет</Hello>
      <Heading>
        Загружаем <span>словарь</span>
      </Heading>
      {error && (
        <>
          <ErrorBox>{error}</ErrorBox>
          {onRetry && (
            <Pill kind="ghost" size="sm" onClick={onRetry}>
              Попробовать ещё раз
            </Pill>
          )}
        </>
      )}
    </Screen>
  );
}
