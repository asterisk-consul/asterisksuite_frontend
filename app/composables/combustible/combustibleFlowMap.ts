export const COMBUSTIBLE_FLOW = {
  carga: {
    flowId: 10987,
    statusId: 1628,
    nextStatusId: 1640
  },
  descarga: {
    flowId: 11016,
    statusId: 1669,
    nextStatusId: 1164
  },
  ajuste: {
    plus: {
      flowId: 11058,
      statusId: 1677,
      nextStatusId: 1717
    },
    minus: {
      flowId: 11057,
      statusId: 1678,
      nextStatusId: 1718
    }
  }
} as const
