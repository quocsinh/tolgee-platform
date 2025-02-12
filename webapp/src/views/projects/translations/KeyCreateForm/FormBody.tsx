import { useCallback, useEffect, useState } from 'react';
import { FastField, FieldArray, FieldProps, useFormikContext } from 'formik';
import { Box, Button, styled, Typography } from '@mui/material';
import { useTranslate, T } from '@tolgee/react';

import { components } from 'tg.service/apiSchema.generated';
import { Editor } from 'tg.component/editor/Editor';
import { useProject } from 'tg.hooks/useProject';
import { FieldLabel } from '../KeySingle/FieldLabel';
import { Tag } from '../Tags/Tag';
import { TagInput } from '../Tags/TagInput';
import LoadingButton from 'tg.component/common/form/LoadingButton';
import { ToolsPottomPanel } from '../TranslationTools/ToolsBottomPanel';
import { useTranslationTools } from '../TranslationTools/useTranslationTools';

type LanguageModel = components['schemas']['LanguageModel'];

const StyledContainer = styled('div')`
  display: grid;
  row-gap: ${({ theme }) => theme.spacing(2)};
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

const StyledField = styled('div')`
  border: 1px solid ${({ theme }) => theme.palette.emphasis[400]};
  overflow: hidden;
  border-radius: 4px;
  &:hover {
    border: 1px solid ${({ theme }) => theme.palette.emphasis[900]};
  }
  &:focus-within {
    border-color: ${({ theme }) => theme.palette.primary.main};
    border-width: 2px;
  }
  & > * {
    padding: 10px;
  }
  &:focus-within > * {
    padding: 9px;
  }
`;

const StyledEdtorWrapper = styled('div')`
  background: ${({ theme }) => theme.palette.background.default};
  align-self: stretch;
  display: grid;
`;

const StyledTags = styled('div')`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  overflow: hidden;
  & > * {
    margin: 0px 3px 3px 0px;
  }
  position: relative;
`;

const StyledError = styled(Typography)`
  display: flex;
  min-height: 1.2rem;
`;

type Props = {
  onCancel?: () => void;
  autofocus?: boolean;
  languages: LanguageModel[];
};

export const FormBody: React.FC<Props> = ({
  onCancel,
  autofocus,
  languages,
}) => {
  const [editedLang, setEditedLang] = useState<string | null>(null);
  const t = useTranslate();
  const form = useFormikContext<any>();
  const project = useProject();

  const onFocus = (lang: string | null) => {
    setEditedLang(lang);
  };

  const onBlur = (lang: string | null) => {
    setEditedLang((val) => (val === lang ? null : val));
  };

  const baseLang = project.baseLanguage?.tag;

  const baseText = form.values?.translations?.[baseLang || ''];
  const targetLang = languages.find(({ tag }) => tag === editedLang);

  const hintRelevant = Boolean(
    baseText && targetLang && editedLang !== baseLang
  );

  const [hintDisplayed, setHintDisplayed] = useState(false);

  const onValueUpdate = useCallback(
    (value: string) => {
      form.setFieldValue(`translations.${editedLang}`, value);
    },
    [editedLang]
  );

  useEffect(() => {
    if (hintRelevant) {
      if (!hintDisplayed) {
        setHintDisplayed(true);
      }
    } else if (!baseText) {
      setHintDisplayed(false);
    }
  }, [hintRelevant, baseText]);

  const toolsData = useTranslationTools({
    projectId: project.id,
    baseText,
    targetLanguageId: targetLang?.id as number,
    keyId: undefined as any,
    onValueUpdate,
    enabled: hintRelevant,
  });

  return (
    <>
      <StyledContainer>
        <FastField name="name">
          {({ field, form, meta }: FieldProps<any>) => {
            return (
              <div>
                <FieldLabel>
                  <T>translation_single_label_key</T>
                </FieldLabel>
                <StyledField>
                  <StyledEdtorWrapper data-cy="translation-create-key-input">
                    <Editor
                      plaintext
                      value={field.value}
                      onChange={(val) => {
                        form.setFieldValue(field.name, val);
                      }}
                      onSave={() => form.handleSubmit()}
                      onBlur={() => form.setFieldTouched(field.name, true)}
                      minHeight="unset"
                      autofocus={autofocus}
                      scrollMargins={{ bottom: 150 }}
                      autoScrollIntoView
                    />
                  </StyledEdtorWrapper>
                </StyledField>
                <StyledError color="error" variant="caption">
                  {meta.touched && meta.error}
                </StyledError>
              </div>
            );
          }}
        </FastField>

        <FieldArray
          name="tags"
          render={(helpers) => (
            <FastField name="tags">
              {({ field }: FieldProps<any>) => {
                return (
                  <div>
                    <FieldLabel>
                      <T>translation_single_label_tags</T>
                    </FieldLabel>
                    <StyledTags>
                      {field.value.map((tag, index) => {
                        return (
                          <Tag
                            key={tag}
                            name={tag}
                            onDelete={() => helpers.remove(index)}
                          />
                        );
                      })}
                      <TagInput
                        existing={field.value}
                        onAdd={(name) =>
                          !field.value.includes(name) && helpers.push(name)
                        }
                        placeholder={t('translation_single_tag_placeholder')}
                      />
                    </StyledTags>
                  </div>
                );
              }}
            </FastField>
          )}
        />
        {languages.map((lang) => (
          <FastField key={lang.tag} name={`translations.${lang.tag}`}>
            {({ field, form, meta }) => (
              <div key={lang.tag}>
                <FieldLabel>{lang.name}</FieldLabel>
                <StyledField>
                  <StyledEdtorWrapper data-cy="translation-create-translation-input">
                    <Editor
                      value={field.value || ''}
                      onSave={() => form.handleSubmit()}
                      onChange={(val) => {
                        form.setFieldValue(field.name, val);
                      }}
                      onBlur={() => onBlur(lang.tag)}
                      onFocus={() => onFocus(lang.tag)}
                      minHeight={50}
                      scrollMargins={{ bottom: 150 }}
                      autoScrollIntoView
                    />
                  </StyledEdtorWrapper>
                </StyledField>
                <StyledError color="error" variant="caption">
                  {meta.touched && meta.error}
                </StyledError>
              </div>
            )}
          </FastField>
        ))}
      </StyledContainer>
      <Box display="flex" alignItems="flex-end" justifySelf="flex-end">
        {onCancel && (
          <Button data-cy="global-form-cancel-button" onClick={onCancel}>
            <T>global_cancel_button</T>
          </Button>
        )}
        <Box ml={1}>
          <LoadingButton
            data-cy="global-form-save-button"
            loading={form.isSubmitting}
            color="primary"
            variant="contained"
            disabled={!form.isValid}
            type="submit"
            onClick={() => form.handleSubmit()}
          >
            <T>global_form_save</T>
          </LoadingButton>
        </Box>
      </Box>
      {hintDisplayed && <ToolsPottomPanel data={toolsData} />}
    </>
  );
};
