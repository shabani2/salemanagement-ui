const ICON_SIZE = 20; // pourquoi: garder icône et label strictement équivalents visuellement
export const iconStyle: React.CSSProperties = {
  fontSize: ICON_SIZE,
  backgroundImage: 'radial-gradient(circle at 30% 30%, #34d399 0%, #10b981 45%, #059669 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  lineHeight: 1,
  display: 'inline-block',
};

export const labelStyle: React.CSSProperties = {
  fontSize: ICON_SIZE,
  lineHeight: 1,
};
