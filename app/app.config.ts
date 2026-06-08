export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'zinc'
    },
    pageHeader: {
      slots: {
        root: 'relative border-b border-default py-3',
        container: '',
        wrapper: 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2',
        headline: 'mb-1 text-xs font-semibold text-primary flex items-center gap-1.5',
        title: 'text-xl sm:text-2xl text-pretty font-bold text-highlighted',
        description: 'text-sm text-pretty text-muted',
        links: 'flex flex-wrap items-center gap-1.5'
      },
      variants: {
        title: {
          true: {
            description: 'mt-2'
          }
        }
      }
    }
  }
})
