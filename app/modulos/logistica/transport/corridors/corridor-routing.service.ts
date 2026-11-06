interface CorridorRoutePoint {
  lat: number
  lng: number
}

export const useCorridorRoutingService = () => ({
  findRoute: async (points: CorridorRoutePoint[]) => {
    const coordinates = points.map(point => `${point.lng},${point.lat}`).join(';')
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`)
    if (!response.ok) throw new Error(`No se pudo calcular la ruta (${response.status})`)
    return response.json() as Promise<any>
  }
})
