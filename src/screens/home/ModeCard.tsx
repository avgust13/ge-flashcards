import styled from 'styled-components';
import { Icon, type IconName } from '../../components/ui/Icon';

interface Props {
  accent: string;
  tint: string;
  icon: IconName;
  title: string;
  subtitle: string;
  extra: string;
  onClick: () => void;
}

const Btn = styled.button`
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: none;
  background: #fff;
  border-radius: 22px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  font-family: ${({ theme }) => theme.fonts.ui};
`;

const IconBox = styled.div<{ $tint: string; $accent: string }>`
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: ${({ $tint }) => $tint};
  color: ${({ $accent }) => $accent};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-weight: 900;
  font-size: 17px;
  color: ${({ theme }) => theme.colors.ink};
`;

const Subtitle = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
  line-height: 1.3;
  margin-top: 2px;
`;

const Extra = styled.div<{ $accent: string }>`
  font-size: 11px;
  font-weight: 800;
  color: ${({ $accent }) => $accent};
  margin-top: 6px;
  letter-spacing: 0.4px;
`;

const Caret = styled.div`
  color: ${({ theme }) => theme.colors.inkMute};
`;

export function ModeCard({ accent, tint, icon, title, subtitle, extra, onClick }: Props) {
  return (
    <Btn onClick={onClick}>
      <IconBox $tint={tint} $accent={accent}>
        <Icon name={icon} size={28} stroke={2.2} />
      </IconBox>
      <Body>
        <Title>{title}</Title>
        <Subtitle>{subtitle}</Subtitle>
        <Extra $accent={accent}>{extra}</Extra>
      </Body>
      <Caret>
        <Icon name="arrow" size={22} />
      </Caret>
    </Btn>
  );
}
