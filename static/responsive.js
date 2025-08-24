document.addEventListener('DOMContentLoaded', () => {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  
  if (isMobile) {
    const terminalHeader = document.querySelector('.terminal-header');
    const terminal = document.querySelector('.terminal');
    
    if (terminalHeader && terminal) {
      const clone = terminalHeader.cloneNode(true);
      terminalHeader.parentNode.replaceChild(clone, terminalHeader);
      
      terminal.style.transform = 'translate(0px, 0px)';
      terminal.classList.remove('dragging');
      
      const newHeader = document.querySelector('.terminal-header');
      if (newHeader) {
        newHeader.style.cursor = 'default';
        newHeader.title = '';
      }
    }
  }
  
  function handleResponsiveAdjustments() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const terminalHeader = document.querySelector('.terminal-header');
    const terminal = document.querySelector('.terminal');
    
    if (isMobile && terminalHeader && terminal) {
      const clone = terminalHeader.cloneNode(true);
      terminalHeader.parentNode.replaceChild(clone, terminalHeader);
      
      terminal.style.transform = 'translate(0px, 0px)';
      terminal.classList.remove('dragging');
      
      const newHeader = document.querySelector('.terminal-header');
      if (newHeader) {
        newHeader.style.cursor = 'default';
        newHeader.title = '';
      }
    } else if (!isMobile && terminalHeader) {
      terminalHeader.style.cursor = 'grab';
    }
  }
  
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResponsiveAdjustments, 100);
  });
  
  handleResponsiveAdjustments();
});