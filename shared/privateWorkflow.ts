import type {ActiveTab} from '../src/types';
export const privateTabs:{id:ActiveTab;label:string;hint:string}[]=[
 {id:'clients',label:'Clientes',hint:'Ficha, necesidades, servicio y pagos.'},
 {id:'seo',label:'Página web',hint:'Consultar, revisar el resultado y decidir si guardarlo.'},
 {id:'social-networks',label:'Redes',hint:'Perfiles públicos y mediciones disponibles por período.'},
 {id:'search-audit',label:'Buscadores',hint:'Consultas y métricas verificadas de búsqueda.'},
 {id:'ai-audit',label:'IA',hint:'Respuestas y menciones con proveedor y evidencia identificados.'},
 {id:'audit-history',label:'Historial',hint:'Auditorías guardadas, comparaciones e informes.'},
];
export const simplePrivateTabs=new Set(['landing',...privateTabs.map(t=>t.id)]);
