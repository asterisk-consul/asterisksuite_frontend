export interface HelpArticleSection {
  heading: string
  text: string
}

export interface HelpArticle {
  slug: string
  title: string
  description: string
  sections: HelpArticleSection[]
}

export const useHelpDocumentsIndexService = () => ({
  findAll: () => $fetch<{ articles: HelpArticle[] }>('/help-documents-index.json')
})
