import styled from 'styled-components';

interface Props {
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step?: number;
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const RoundBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  border: none;
  background: #F3EBD8;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.fonts.ui};
`;

const Value = styled.div`
  font-size: 28px;
  font-weight: 900;
  font-family: ${({ theme }) => theme.fonts.ui};
  min-width: 44px;
  text-align: center;
`;

export function Stepper({ value, setValue, min, max, step = 5 }: Props) {
  return (
    <Wrap>
      <RoundBtn onClick={() => setValue(Math.max(min, value - step))}>−</RoundBtn>
      <Value>{value}</Value>
      <RoundBtn onClick={() => setValue(Math.min(max, value + step))}>+</RoundBtn>
    </Wrap>
  );
}
