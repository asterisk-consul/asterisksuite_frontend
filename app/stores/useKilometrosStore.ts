import { defineStore } from 'pinia'
import { useFileParser } from '@/composables/useFileParser'
import { fetchData, postData } from '../composables/apiService'

import { formatearFecha } from '@/utils/formatearFecha'
import * as XLSX from 'xlsx'

export const useKilometrosStore = defineStore('csv', {
  state: () => ({
    csvData: [] as CSVRow[],
    headers: [] as string[],
    transformedData: [] as TransformedRow[],
    detectedPairs: [] as PairDetected[],
    loading: false,
    error: null as string | null
  }),

  actions: {
    async loadFile(file: File): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const { parseFile } = useFileParser()
        const data: CSVRow[] = await parseFile(file, { header: false })

        console.log('✅ Archivo cargado:', data)

        this.headers = (data[0] as string[]) || []
        this.csvData = data.slice(1)
        this.detectPairs()

        return true
      } catch (err: any) {
        this.error = err.message
        console.error('❌ Error cargando archivo:', err)
        return false
      } finally {
        this.loading = false
      }
    },

    detectPairs() {
      const pairs: PairDetected[] = []
      const data = this.csvData

      for (let i = 0; i < data.length - 1; i++) {
        const currentRow = data[i]
        const nextRow = data[i + 1]

        if (!currentRow || !nextRow) continue

        const isFechaRow =
          currentRow[1] && String(currentRow[1]).toLowerCase().includes('fecha')

        const isKmRow =
          nextRow[0] &&
          String(nextRow[0]).trim() !== '' &&
          nextRow[1] &&
          String(nextRow[1]).toLowerCase().includes('km')

        if (isFechaRow && isKmRow) {
          const textoCamion = String(nextRow[0]).trim()
          const index = textoCamion.lastIndexOf('-')

          let nombreCamion = textoCamion
          let patente = ''

          if (index !== -1) {
            nombreCamion = textoCamion.slice(0, index).trim()
            patente = textoCamion.slice(index + 1).trim()
          }

          pairs.push({
            fechaRowIndex: i,
            kmRowIndex: i + 1,
            camion: nombreCamion,
            patente
          })
        }
      }

      this.detectedPairs = pairs
    },

    transformData(): TransformedRow[] {
      if (this.detectedPairs.length === 0) {
        console.warn('⚠️ No hay pares detectados')
        return []
      }

      const result: TransformedRow[] = []
      let idCounter = 1 // Contador para generar IDs

      this.detectedPairs.forEach((pair) => {
        const fechaRow = this.csvData[pair.fechaRowIndex]
        const kmRow = this.csvData[pair.kmRowIndex]
        const patente = pair.patente

        if (!fechaRow || !kmRow) return

        for (let col = 2; col < fechaRow.length; col++) {
          const fecha = fechaRow[col]
          const km = kmRow[col]

          if (fecha && km && km !== '0' && km !== '' && km !== '0,00') {
            // Convertir km a número
            const kmString = String(km).replace(',', '.')
            const kmNumber = parseFloat(kmString)

            // Solo agregar si la conversión es válida
            if (!isNaN(kmNumber)) {
              result.push({
                id: idCounter++,
                descripcion: patente,
                fecha: String(fecha).trim(),
                kilometros: kmNumber
              })
            }
          }
        }
      })

      this.transformedData = result
      console.log('✨ Datos transformados:', result.length, 'registros')
      return result
    },
    _downloadFile(blob: Blob, filename: string) {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    },

    exportCSV(filteredData: TransformedRow[] | null = null): boolean {
      const data = filteredData || this.transformedData
      if (data.length === 0) {
        console.warn('⚠️ No hay datos para exportar')
        return false
      }

      const csvContent = [
        'Descripción,Fecha,Kilómetros',
        ...data.map(
          (row) => `"${row.descripcion}","${row.fecha}",${row.kilometros}`
        )
      ].join('\n')

      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
      })

      this._downloadFile(blob, 'kilometros_transformado.csv')
      console.log('💾 CSV exportado:', data.length, 'registros')
      return true
    },

    exportXLSX(filteredData: TransformedRow[] | null = null): boolean {
      const data = filteredData || this.transformedData
      if (data.length === 0) {
        console.warn('⚠️ No hay datos para exportar')
        return false
      }

      try {
        const worksheet = XLSX.utils.json_to_sheet(
          data.map((row) => ({
            Descripción: row.descripcion,
            Fecha: row.fecha,
            Kilómetros: row.kilometros
          }))
        )

        worksheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }]

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Kilómetros')

        XLSX.writeFile(workbook, 'kilometros_transformado.xlsx')
        console.log('📊 Excel exportado:', data.length, 'registros')
        return true
      } catch (err: any) {
        console.error('❌ Error exportando Excel:', err)
        this.error = err.message
        return false
      }
    },

    exportJSON(filteredData: TransformedRow[] | null = null): boolean {
      const data = filteredData || this.transformedData
      if (data.length === 0) {
        console.warn('⚠️ No hay datos para exportar')
        return false
      }

      const jsonContent = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonContent], {
        type: 'application/json;charset=utf-8;'
      })

      this._downloadFile(blob, 'kilometros_transformado.json')
      console.log('📄 JSON exportado:', data.length, 'registros')
      return true
    },

    async saveRegistroCabyCuerpo(
      registros: TransformedRow[],
      onProgress:
        | ((current: number, registro: TransformedRow) => void)
        | null = null
    ): Promise<{ success: boolean; resultados: SaveResult }> {
      const authStore = useAuthStore()

      const resultados: SaveResult = {
        exitosos: [],
        fallidos: [],
        total: registros.length
      }

      console.log(`🚀 Iniciando envío de ${registros.length} registros...`)

      try {
        const artKilometros: Articulo = await fetchData('/articulo/show/1860')

        const depositos = artKilometros.articulosDepositos
        const flowid = 11087
        const statusid = 1713
        const statusflowid = 779
        const sigstatusid = 1714

        for (let i = 0; i < registros.length; i++) {
          const registro = registros[i]

          if (!registro) {
            console.warn(`⚠️ Registro ${i + 1} es undefined, saltando...`)
            continue
          }

          if (onProgress) onProgress(i + 1, registro)

          try {
            console.log(`📦 [${i + 1}/${registros.length}] ${registro.patente}`)

            const depositoEncontrado = depositos.find(
              (d: any) =>
                d.deposito?.descrip?.trim().toLowerCase() ===
                registro.patente?.trim().toLowerCase()
            )

            if (!depositoEncontrado) {
              throw new Error(
                `Depósito no encontrado para patente: ${registro.patente}`
              )
            }

            const depositoArticuloId = depositoEncontrado.id

            const dataCab: RegistroCabCreate = {
              id: -1,
              flowid,
              fecha: formatearFecha(registro.fecha),
              statusid,
              responsableactactualid: authStore.userData.perfilid,
              statusflowid,
              responsableactactual: {
                id: authStore.userData.perfilid,
                identificador: ''
              },
              xlatitud: -32.4097451,
              xlongitud: -63.2385806,
              showDependeDe: false
            }

            const respCab: ApiResponse = await postData(
              '/workspace/saveRegistroCab',
              dataCab
            )
            // console.log('Status:', respCab.status)
            // console.log('Data:', respCab.data.id)

            if (respCab.status === 200) {
              const dataCuerpo = {
                presupcabid: respCab.data.id,
                articulo: 'kilometros',
                articulodepositoid: depositoArticuloId,
                cuerpoflowid: flowid,
                cuerpostatusid: statusid,
                cantidad: registro.kilometros,
                articulospecresult: '{}',
                medidasancho: 1,
                medidasalto: 1,
                medidaslargo: 1,
                porcentajuste: 0,
                impuestoalic: 0,
                xlatitud: -32.4097451,
                xlongitud: -63.2385806
              }
              console.log(dataCuerpo)

              const respCuerpo: ApiResponse = await postData(
                '/workspace/saveRegistroCuerpo',
                dataCuerpo
              )

              if (respCuerpo.status === 200) {
                const save: ApiResponse = await postData(
                  '/workspace/getRegistroCabGeneric',
                  {
                    id: respCab.data.id,
                    checkuser: true
                  }
                )
                await postData('/workspace/getRegistroCabGeneric', save.data)

                const respuestaSiguiente = {
                  siguienteEstadoCommandList: [
                    {
                      id: respCuerpo.data.id,
                      macroProcesoSiguienteId: flowid,
                      sigstatusid
                    }
                  ]
                }

                const respEstadoSiguiente = (await postData(
                  '/workspace/setProximoEstadoCuerposYCab',
                  respuestaSiguiente
                )) as ApiResponse

                if (
                  respEstadoSiguiente.status === 200 ||
                  respEstadoSiguiente.status === 204
                ) {
                  resultados.exitosos.push(registro)
                } else {
                  throw new Error(
                    `Error al actualizar estado. Status: ${respEstadoSiguiente.status}`
                  )
                }
              } else {
                throw new Error('Error al guardar el cuerpo del registro')
              }
            } else {
              throw new Error('Error al guardar la cabecera del registro')
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Error desconocido'
            console.error('❌ Error detallado:', error)

            // ✅ Forzar el tipo completo
            resultados.fallidos.push({
              descripcion: registro.descripcion,
              fecha: registro.fecha,
              kilometros: registro.kilometros,
              patente: registro.patente ?? 'Sin patente', // Si puede ser undefined
              error: errorMessage
            } as TransformedRow & { error: string })
          }

          if (i < registros.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300))
          }
        }
      } catch (error: any) {
        console.error('❌ Error crítico:', error)
        this.error = error.message
      }

      console.log('\n📊 RESUMEN:')
      console.log(`✅ Exitosos: ${resultados.exitosos.length}`)
      console.log(`❌ Fallidos: ${resultados.fallidos.length}`)

      return {
        success: resultados.fallidos.length === 0,
        resultados
      }
    },

    reset() {}
  }
})
