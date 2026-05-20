import { useState } from 'react';
import styled from 'styled-components';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { Icon } from '../ui/Icon';
import { IosInstallSheet } from './IosInstallSheet';

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
  const { canInstall, platform, install, dismiss } = useInstallPrompt();
  const [showIosSheet, setShowIosSheet] = useState(false);

  const onPrimary = () => {
    if (platform === 'ios') {
      setShowIosSheet(true);
    } else {
      void install();
    }
  };

  const closeIosSheet = () => setShowIosSheet(false);

  return (
    <>
      {canInstall && (
        <Bar role="dialog" aria-label="Install Georgian Flashcards">
          <Text>
            <Title>
              {platform === 'ios' ? 'Install on iPhone' : 'Install Georgian Flashcards'}
            </Title>
            <Sub>
              {platform === 'ios'
                ? 'Add to your home screen via the Share menu'
                : 'Add to your home screen for the full app experience'}
            </Sub>
          </Text>
          <InstallBtn onClick={onPrimary}>
            {platform === 'ios' ? 'How' : 'Install'}
          </InstallBtn>
          <CloseBtn onClick={dismiss} aria-label="Dismiss">
            <Icon name="close" size={16} />
          </CloseBtn>
        </Bar>
      )}
      <IosInstallSheet open={showIosSheet} onClose={closeIosSheet} />
    </>
  );
}
