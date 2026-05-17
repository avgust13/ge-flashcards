import styled from 'styled-components';

export const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.inkMute};
  margin-bottom: 8px;
`;
