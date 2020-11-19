package io.polygloat.service

import io.polygloat.controllers.ImportDto
import io.polygloat.model.Repository
import io.polygloat.model.Source
import io.polygloat.model.Translation
import io.polygloat.repository.SourceRepository
import io.polygloat.repository.TranslationRepository
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.OutputStream
import java.util.stream.Collectors
import kotlin.collections.ArrayList

@Service
open class ImportService(
        private val languageService: LanguageService,
        private val keyService: KeyService,
        private val sourceRepository: SourceRepository,
        private val translationRepository: TranslationRepository
) {

    @Autowired
    private lateinit var translationService: TranslationService;

    @Transactional
    open fun import(repository: Repository, dto: ImportDto, emitter: OutputStream) {
        val language = languageService.getOrCreate(repository, dto.languageAbbreviation)
        val allKeys = keyService.getAllKeys(repository.id).stream().collect(Collectors.toMap({ it.name }, { it }))
        val allTranslations = translationService.getAllByLanguageId(language.id)
                .stream()
                .collect(Collectors.toMap({ it.key.id }, { it }))

        val keysToSave = ArrayList<Source>();
        val translationsToSave = ArrayList<Translation>()

        for ((index, entry) in dto.data!!.entries.withIndex()) {
            val key = allKeys[entry.key] ?: {
                val keyToSave = Source(name = entry.key, repository = repository)
                keysToSave.add(keyToSave)
                keyToSave

            }()

            val translation = allTranslations[key.id] ?: Translation()
            translation.key = key
            translation.language = language
            translation.text = entry.value
            translationsToSave.add(translation)
            emitter.write(index);
        }

        sourceRepository.saveAll(keysToSave)
        translationRepository.saveAll(translationsToSave)
    }
}