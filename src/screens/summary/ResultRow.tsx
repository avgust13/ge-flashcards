import styled from 'styled-components';
import { Icon } from '../../components/ui/Icon';
import type { Mode, SessionResult } from '../../types';
import { isFlashResult } from '../../types';

interface Props {
  r: SessionResult;
  mode: Mode;
  last: boolean;
}

const Row = styled.div<{ $last: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: ${({ $last, theme }) =>
    $last ? 'none' : `1px solid ${theme.colors.line}`};
`;

const Mark = styled.div<{ $ok: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background: ${({ $ok, theme }) => ($ok ? theme.colors.successSoft : theme.colors.dangerSoft)};
  color: ${({ $ok, theme }) => ($ok ? theme.colors.success : theme.colors.danger)};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Ka = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 17px;
  color: ${({ theme }) => theme.colors.ink};
`;

const Meta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: -1px;

  span {
    color: ${({ theme }) => theme.colors.ink};
  }
`;

const HintTag = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: #9A6D00;
  background: ${({ theme }) => theme.colors.warnSoft};
  padding: 3px 8px;
  border-radius: 99px;
`;

export function ResultRow({ r, mode, last }: Props) {
  const isFlash = mode === 'flash';
  const ok = isFlashResult(r) ? r.right : r.perfect;
  return (
    <Row $last={last}>
      <Mark $ok={ok}>
        <Icon name={ok ? 'check' : 'close'} size={14} stroke={2.6} />
      </Mark>
      <Body>
        <Ka>{r.ka}</Ka>
        <Meta>
          /{r.tr}/ · <span>{r.ru}</span>
        </Meta>
      </Body>
      {!isFlash && !isFlashResult(r) && r.hints > 0 && (
        <HintTag>
          {r.hints} hint{r.hints > 1 ? 's' : ''}
        </HintTag>
      )}
    </Row>
  );
}
