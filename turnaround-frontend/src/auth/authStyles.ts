type AuthTheme = 'dark' | 'light';

export const getAuthStyles = (theme: AuthTheme) => {
  const dark = theme === 'dark';

  return {
    page: dark ? 'bg-[#0A051B] text-[#F4F5F7]' : 'bg-[#F5F3FB] text-[#250C77]',
    formPanel: dark ? 'bg-[#0E0724]/90' : 'bg-white/90',
    card: dark ? 'border-white/10 bg-[#0B0928]/80' : 'border-[#250C77]/15 bg-white/95',
    title: dark ? 'text-white' : 'text-[#250C77]',
    text: dark ? 'text-gray-300' : 'text-gray-600',
    muted: dark ? 'text-gray-400' : 'text-gray-500',
    error: dark ? 'text-red-400' : 'text-red-700',
    hoverText: dark ? 'hover:text-white' : 'hover:text-[#250C77]',
    label: dark ? 'text-gray-200' : 'text-gray-700',
    input: dark
      ? 'border-white/10 bg-white/5 text-white placeholder:text-white/45 focus:bg-white/10'
      : 'border-[#250C77]/20 bg-white text-gray-900 placeholder:text-gray-400 focus:bg-white',
    icon: dark ? 'text-gray-400' : 'text-gray-500',
    toggle: dark
      ? 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
      : 'border-[#250C77]/15 bg-white text-[#250C77] hover:bg-[#250C77]/5',
    secondaryButton: dark
      ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
      : 'border-[#250C77]/20 bg-white text-[#250C77] hover:bg-[#250C77]/5',
  };
};
