import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Icon } from './Icon';

interface Props {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 8px;
`;

const BackBtn = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.ink};
`;

const Title = styled.div<{ $alignLeft: boolean }>`
  flex: 1;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  font-size: 17px;
  color: ${({ theme }) => theme.colors.ink};
  text-align: ${({ $alignLeft }) => ($alignLeft ? 'left' : 'center')};
`;

const Right = styled.div`
  min-width: 36px;
  display: flex;
  justify-content: flex-end;
`;

export function ScreenHeader({ title, onBack, right }: Props) {
  return (
    <Wrap>
      {onBack && (
        <BackBtn onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </BackBtn>
      )}
      <Title $alignLeft={!!onBack}>{title}</Title>
      <Right>{right}</Right>
    </Wrap>
  );
}
