import styled from 'styled-components';

interface Props {
  ka: string;
  filledRu?: string;
  state: 'pending' | 'next' | 'correct' | 'wrong';
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const Ka = styled.div<{ $state: Props['state'] }>`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  padding: 0 2px;
  color: ${({ $state, theme }) => {
    if ($state === 'correct') return theme.colors.success;
    if ($state === 'next') return theme.colors.ink;
    return theme.colors.inkSoft;
  }};
`;

const Box = styled.div<{ $state: Props['state'] }>`
  width: 36px;
  height: 42px;
  border-radius: 10px;
  background: ${({ $state, theme }) => {
    if ($state === 'wrong') return theme.colors.dangerSoft;
    if ($state === 'correct') return theme.colors.successSoft;
    return '#fff';
  }};
  border: 1.5px solid
    ${({ $state, theme }) => {
      if ($state === 'wrong') return theme.colors.danger;
      if ($state === 'correct') return theme.colors.success;
      if ($state === 'next') return theme.colors.primary;
      return theme.colors.line;
    }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 900;
  font-size: 22px;
  color: ${({ $state, theme }) => {
    if ($state === 'wrong') return theme.colors.danger;
    if ($state === 'correct') return theme.colors.success;
    return theme.colors.inkMute;
  }};
  transition: all 0.15s;
`;

export function LetterSlot({ ka, filledRu, state }: Props) {
  return (
    <Wrap>
      <Ka $state={state}>{ka}</Ka>
      <Box $state={state}>{filledRu ?? ''}</Box>
    </Wrap>
  );
}
