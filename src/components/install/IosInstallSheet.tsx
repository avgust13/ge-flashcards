import styled from 'styled-components';
import { Pill } from '../ui/Pill';

interface Props {
  open: boolean;
  onClose: () => void;
}

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(31, 26, 20, 0.45);
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  align-items: flex-end;
  justify-content: center;
`;

const Sheet = styled.div`
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  padding: 20px 22px 24px;
  box-shadow: 0 -10px 30px rgba(31, 26, 20, 0.25);
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
`;

const Heading = styled.div`
  font-size: 18px;
  font-weight: 900;
  margin-bottom: 14px;
`;

const Step = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 0;
`;

const StepNum = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-weight: 900;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StepText = styled.div`
  font-size: 14px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const ShareIcon = styled.svg`
  vertical-align: middle;
  color: ${({ theme }) => theme.colors.blue};
`;

const Actions = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
`;

export function IosInstallSheet({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <Overlay $open={open} onClick={onClose} role="dialog" aria-label="Install on iPhone">
      <Sheet onClick={(e) => e.stopPropagation()}>
        <Heading>Install on iPhone</Heading>
        <Step>
          <StepNum>1</StepNum>
          <StepText>
            Tap the Share button
            <ShareIcon
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4M8 8l4-4 4 4M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
            </ShareIcon>
            at the bottom of Safari
          </StepText>
        </Step>
        <Step>
          <StepNum>2</StepNum>
          <StepText>Scroll and pick «Add to Home Screen»</StepText>
        </Step>
        <Step>
          <StepNum>3</StepNum>
          <StepText>Confirm «Add» in the top-right corner</StepText>
        </Step>
        <Actions>
          <Pill kind="primary" onClick={onClose}>
            Got it
          </Pill>
        </Actions>
      </Sheet>
    </Overlay>
  );
}
