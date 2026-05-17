import styled from 'styled-components';

interface Props {
  on: boolean;
  onToggle: () => void;
}

const Btn = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 4px 4px;
  font-family: ${({ theme }) => theme.fonts.ui};
  width: 100%;
`;

const Track = styled.span<{ $on: boolean }>`
  width: 38px;
  height: 22px;
  border-radius: 11px;
  position: relative;
  background: ${({ $on, theme }) => ($on ? theme.colors.success : '#E5DDC9')};
  transition: background 0.2s;
  flex-shrink: 0;
`;

const Knob = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $on }) => ($on ? 18 : 2)}px;
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: left 0.15s;
`;

const Text = styled.span`
  flex: 1;
  text-align: left;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.ink};
`;

const Sub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

export function MixToggle({ on, onToggle }: Props) {
  return (
    <Btn onClick={onToggle} type="button">
      <Track $on={on}>
        <Knob $on={on} />
      </Track>
      <Text>
        <Title>Mix new + review</Title>
        <Sub>Lean toward weaker words (70/30)</Sub>
      </Text>
    </Btn>
  );
}
