import styled from 'styled-components';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { Icon } from '../ui/Icon';

const Bar = styled.div`
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 50;
  background: ${({ theme }) => theme.colors.ink};
  color: #fff;
  border-radius: 18px;
  padding: 10px 12px 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(31, 26, 20, 0.25);
  font-family: ${({ theme }) => theme.fonts.ui};
`;

const Text = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-weight: 900;
  font-size: 14px;
`;

const Sub = styled.div`
  font-size: 12px;
  opacity: 0.7;
  margin-top: 1px;
`;

const InstallBtn = styled.button`
  border: none;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 999px;
  box-shadow: 0 2px 0 ${({ theme }) => theme.colors.primaryDark};
`;

const CloseBtn = styled.button`
  border: none;
  cursor: pointer;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  width: 30px;
  height: 30px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export function InstallPrompt() {
  const { canInstall, install, dismiss } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <Bar role="dialog" aria-label="Install Georgian Flashcards">
      <Text>
        <Title>Install Georgian Flashcards</Title>
        <Sub>Add to your home screen for the full app experience</Sub>
      </Text>
      <InstallBtn onClick={install}>Install</InstallBtn>
      <CloseBtn onClick={dismiss} aria-label="Dismiss">
        <Icon name="close" size={16} />
      </CloseBtn>
    </Bar>
  );
}
