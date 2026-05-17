import styled from 'styled-components';
import { Icon, type IconName } from '../../components/ui/Icon';

interface Props {
  icon: IconName;
  color: string;
  label: string;
  value: number;
}

const Card = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 12px 10px;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
`;

const IconWrap = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${({ $color }) => $color + '22'};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Value = styled.div`
  font-size: 20px;
  font-weight: 900;
  margin-top: 6px;
`;

const Label = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-weight: 700;
`;

export function StatCard({ icon, color, label, value }: Props) {
  return (
    <Card>
      <IconWrap $color={color}>
        <Icon name={icon} size={18} stroke={2.2} />
      </IconWrap>
      <Value>{value}</Value>
      <Label>{label}</Label>
    </Card>
  );
}
