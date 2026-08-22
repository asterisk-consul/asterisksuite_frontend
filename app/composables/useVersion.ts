import versions from '~~/versiones/versions.json'

export const useVersion = () => {
  const latest = versions[0]

  return {
    version: latest?.version,
    stage: latest?.stage,
    notes: latest?.notes
  }
}
