import { components } from 'tg.service/apiSchema.generated';
import { actionsConfiguration, entitiesConfiguration } from './configuration';
import {
  Activity,
  ActivityModel,
  DiffValue,
  Entity,
  EntityEnum,
  EntityOptions,
  Field,
  FieldOptionsObj,
  Reference,
} from './types';

type ModifiedEntityModel = components['schemas']['ModifiedEntityModel'];

export const getDiffVersion = (
  version: 'new' | 'old',
  modifications: ModifiedEntityModel['modifications']
) => {
  const result = {};
  Object.entries(modifications || {}).forEach(([key, value]) => {
    result[key] = value[version];
  });
  return result as any;
};

const buildField = (
  value: DiffValue<any>,
  options: FieldOptionsObj,
  name: string
): Field => {
  const label = options.label;

  return {
    name,
    value,
    label,
    options,
  };
};

const getFieldValue = (
  fieldName: string,
  modifications: ModifiedEntityModel['modifications'],
  options: FieldOptionsObj
): DiffValue<any> | undefined => {
  if (!options.compute) {
    return modifications?.[fieldName] as DiffValue<any>;
  }

  const newValues = getDiffVersion('new', modifications);
  const oldValues = getDiffVersion('old', modifications);

  const result = {
    new: options.compute?.(newValues),
    old: options.compute?.(oldValues),
  };

  if (result.new === undefined && result.old === undefined) {
    return undefined;
  }
  return result;
};

const reduceReferences = (allReferences: Reference[]): Reference[] => {
  const unifiedMap = new Map<string, Reference>();
  const otherReferences: Reference[] = [];

  const mergeReference = <T extends Reference>(
    id: any,
    reference: T,
    merge: (existingRef: T, newRef: T) => T
  ) => {
    const identificator = `${reference.type}:${id}`;
    if (unifiedMap.has(identificator)) {
      unifiedMap.set(
        identificator,
        merge(unifiedMap.get(identificator) as T, reference)
      );
    } else {
      unifiedMap.set(identificator, reference);
    }
  };

  allReferences.forEach((reference) => {
    switch (reference.type) {
      case 'key':
        mergeReference(reference.id, reference, (oldRef, newRef) => {
          return {
            ...oldRef,
            languages: [
              ...(oldRef.languages || []),
              ...(newRef.languages || []),
            ],
          };
        });
        break;

      default:
        otherReferences.push(reference);
    }
  });

  return [...unifiedMap.values(), ...otherReferences];
};

const buildEntity = (
  entityType: EntityEnum,
  entityData: ModifiedEntityModel,
  options: EntityOptions,
  selectedFields: string[]
): Entity => {
  const result: Entity = {
    type: entityType,
    options,
    fields: [],
    references: options.references?.(entityData) || [],
  };

  Object.entries(options.fields)
    .filter(([field]) => selectedFields.includes(field))
    .forEach(([fieldName, o]) => {
      if (!o) {
        return null;
      }
      const optionsObj = (typeof o === 'object' ? o : {}) as FieldOptionsObj;

      const fieldData = getFieldValue(
        fieldName,
        entityData.modifications,
        optionsObj
      );

      if (fieldData) {
        result.fields.push(buildField(fieldData, optionsObj, fieldName));
      }
    });

  return result;
};

export const buildActivity = (
  data: ActivityModel,
  filter = false
): Activity => {
  const options = actionsConfiguration[data.type];

  const result: Activity = {
    translationKey: options?.label,
    type: data.type,
    entities: [],
    references: [],
    counts: data.counts || {},
    options: options!,
  };

  let allReferences: Reference[] = [];

  if (data.modifiedEntities) {
    const entities = filter
      ? Object.keys(options?.entities || {})
      : Object.keys(data.modifiedEntities);

    entities.forEach((entityName) => {
      if (filter && !options?.entities?.[entityName]) {
        return;
      }
      const entityOptions = entitiesConfiguration[entityName] as
        | EntityOptions
        | undefined;

      const selectedFields =
        filter && Array.isArray(options?.entities?.[entityName])
          ? (options?.entities?.[entityName] as string[])
          : Object.keys(entityOptions?.fields || {});

      const values = data.modifiedEntities?.[entityName];

      values?.forEach((entityData) => {
        if (entityOptions) {
          const entity = buildEntity(
            entityName as EntityEnum,
            entityData,
            entityOptions,
            selectedFields
          );

          result.entities.push(entity);
          allReferences = allReferences.concat(entity.references);
        }
      });
    });

    result.references = reduceReferences(allReferences);
  }

  return result;
};
