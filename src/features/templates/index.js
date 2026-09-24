export {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateById,
  getAllTemplates,
  getTemplatesByType,
  duplicateTemplate,
  toggleTemplateActive,
} from './templatesStore';

export {
  TEMPLATE_TYPES,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPE_ICONS,
  TEMPLATE_FIELDS_BY_TYPE,
} from './templateTypes';

export { resolveVariables } from './resolveVariables';
