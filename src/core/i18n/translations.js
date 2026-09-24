const translations = {
  es: {
    appTitle: 'AppSeguimiento',
    tabs: { dashboard: 'Dashboard', kanban: 'Tablero', tabla: 'Tabla', reportes: 'Reportes', estadisticas: 'Estadísticas', utiles: 'Útiles', 'mi-espacio': 'Mi Espacio' },
    actions: { nuevo: 'Nuevo caso', reporte: 'Reporte', buscar: 'Buscar por nombre, teléfono o localidad...', guardar: 'Guardar', cancelar: 'Cancelar', eliminar: 'Eliminar', cerrar: 'Cerrar', editar: 'Editar' },
    config: { titulo: 'Configuración', general: 'General', columnas: 'Columnas', apariencia: 'Apariencia', datos: 'Datos' },
    notif: { title: 'Notificaciones', empty: 'Sin notificaciones', markAllRead: 'Marcar todas leídas' },
    calendar: { title: 'Calendario de Citas' },
    notes: { title: 'Bloc de Notas' },
    search: { title: 'Búsqueda Global', noResults: 'Sin resultados' },
    common: { loading: 'Cargando...', noData: 'Sin datos', confirm: '¿Estás seguro?', success: 'Operación exitosa', error: 'Ocurrió un error' },
  },
  en: {
    appTitle: 'AppSeguimiento',
    tabs: { dashboard: 'Dashboard', kanban: 'Board', tabla: 'Table', reportes: 'Reports', estadisticas: 'Statistics', utiles: 'Tools', 'mi-espacio': 'My Space' },
    actions: { nuevo: 'New case', reporte: 'Report', buscar: 'Search by name, phone or location...', guardar: 'Save', cancelar: 'Cancel', eliminar: 'Delete', cerrar: 'Close', editar: 'Edit' },
    config: { titulo: 'Settings', general: 'General', columnas: 'Columns', apariencia: 'Appearance', datos: 'Data' },
    notif: { title: 'Notifications', empty: 'No notifications', markAllRead: 'Mark all read' },
    calendar: { title: 'Calendar' },
    notes: { title: 'Notepad' },
    search: { title: 'Global Search', noResults: 'No results' },
    common: { loading: 'Loading...', noData: 'No data', confirm: 'Are you sure?', success: 'Operation successful', error: 'An error occurred' },
  },
};

export function getTranslations(lang) {
  return translations[lang] || translations.es;
}

export default translations;
