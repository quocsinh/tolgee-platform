import {container, singleton} from 'tsyringe';

import {LanguageService} from '../../service/languageService';
import {AbstractLoadableActions, StateWithLoadables} from "../AbstractLoadableActions";
import {useSelector} from "react-redux";
import {AppState} from "../index";
import {ActionType} from "../Action";
import {RepositoryActions} from "../repository/RepositoryActions";

export class LanguagesState extends StateWithLoadables<LanguageActions> {
}

@singleton()
export class LanguageActions extends AbstractLoadableActions<LanguagesState> {
    private service = container.resolve(LanguageService);

    constructor() {
        super(new LanguagesState());
    }

    get loadableDefinitions() {
        return {
            list: this.createLoadableDefinition(this.service.getLanguages),
            language: this.createLoadableDefinition(this.service.get),
            create: this.createLoadableDefinition(this.service.create, undefined, "Language created"),
            edit: this.createLoadableDefinition(this.service.editLanguage, undefined, "Language saved"),
            delete: this.createLoadableDefinition(this.service.delete, undefined, "Language deleted"),
        };
    }

    useSelector<T>(selector: (state: LanguagesState) => T): T {
        return useSelector((state: AppState) => selector(state.languages))
    }

    customReducer(state: LanguagesState, action: ActionType<any>, appState): LanguagesState {
        if (action.type === container.resolve(RepositoryActions).loadableActions.repository.fulfilledType) {
            this.resetLoadable(state, "list");
        }
        return state;
    }

    get prefix(): string {
        return 'LANGUAGES';
    }
}

