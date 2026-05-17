import styled from 'styled-components';
import { Icon } from '../../components/ui/Icon';

const Btn = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.line};
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

export function RandomDice({ onClick }: { onClick: () => void }) {
  return (
    <Btn onClick={onClick}>
      <Icon name="sparkle" size={14} stroke={2.2} />
      Random
    </Btn>
  );
}
