import "./preferences.scss";

import React from "react";
import { observer } from "mobx-react";
import { action, computed, observable } from "mobx";
import { Icon } from "../icon";
import { Select, SelectOption } from "../select";
import { UserStore } from "../../../common/user-store";
import { HelmRepo, HelmRepoManager } from "../../../main/helm/helm-repo-manager";
import { Input } from "../input";
import { Checkbox } from "../checkbox";
import { Notifications } from "../notifications";
import { Badge } from "../badge";
import { Button } from "../button";
import { ThemeStore } from "../../theme.store";
import { Tooltip } from "../tooltip";
import { KubectlBinaries } from "./kubectl-binaries";
import { appPreferenceRegistry } from "../../../extensions/registries/app-preference-registry";
import { PageLayout } from "../layout/page-layout";
import { AddHelmRepoDialog } from "./add-helm-repo-dialog";

@observer
export class Preferences extends React.Component {
  @observable helmLoading = false;
  @observable helmRepos: HelmRepo[] = [];
  @observable helmAddedRepos = observable.map<string, HelmRepo>();
  @observable httpProxy = UserStore.getInstance().preferences.httpsProxy || "";

  @computed get themeOptions(): SelectOption<string>[] {
    return ThemeStore.getInstance().themes.map(theme => ({
      label: theme.name,
      value: theme.id,
    }));
  }

  @computed get helmOptions(): SelectOption<HelmRepo>[] {
    return this.helmRepos.map(repo => ({
      label: repo.name,
      value: repo,
    }));
  }

  async componentDidMount() {
    await this.loadHelmRepos();
  }

  @action
  async loadHelmRepos() {
    this.helmLoading = true;

    try {
      if (!this.helmRepos.length) {
        this.helmRepos = await HelmRepoManager.getInstance().loadAvailableRepos(); // via https://helm.sh
      }
      const repos = await HelmRepoManager.getInstance().repositories(); // via helm-cli

      this.helmAddedRepos.clear();
      repos.forEach(repo => this.helmAddedRepos.set(repo.name, repo));
    } catch (err) {
      Notifications.error(String(err));
    }
    this.helmLoading = false;
  }

  async addRepo(repo: HelmRepo) {
    try {
      await HelmRepoManager.getInstance().addRepo(repo);
      this.helmAddedRepos.set(repo.name, repo);
    } catch (err) {
      Notifications.error(<>Adding helm branch <b>{repo.name}</b> has failed: {String(err)}</>);
    }
  }

  async removeRepo(repo: HelmRepo) {
    try {
      await HelmRepoManager.getInstance().removeRepo(repo);
      this.helmAddedRepos.delete(repo.name);
    } catch (err) {
      Notifications.error(
        <>Removing helm branch <b>{repo.name}</b> has failed: {String(err)}</>
      );
    }
  }

  onRepoSelect = async ({ value: repo }: SelectOption<HelmRepo>) => {
    const isAdded = this.helmAddedRepos.has(repo.name);

    if (isAdded) {
      Notifications.ok(<>Helm branch <b>{repo.name}</b> already in use</>);

      return;
    }
    this.helmLoading = true;
    await this.addRepo(repo);
    this.helmLoading = false;
  };

  formatHelmOptionLabel = ({ value: repo }: SelectOption<HelmRepo>) => {
    const isAdded = this.helmAddedRepos.has(repo.name);

    return (
      <div className="flex gaps">
        <span>{repo.name}</span>
        {isAdded && <Icon small material="check" className="box right"/>}
      </div>
    );
  };

  render() {
    const { preferences } = UserStore.getInstance();

    return (
      <PageLayout showOnTop className="Preferences" header={<h2>Preferences</h2>}>
        <h2>Color Theme</h2>
        <Select
          options={this.themeOptions}
          value={preferences.colorTheme}
          onChange={({ value }: SelectOption) => preferences.colorTheme = value}
        />

        <h2>HTTP Proxy</h2>
        <Input
          theme="round-black"
          placeholder={`Type HTTP proxy url (example: http://proxy.acme.org:8080)`}
          value={this.httpProxy}
          onChange={v => this.httpProxy = v}
          onBlur={() => preferences.httpsProxy = this.httpProxy}
        />
        <small className="hint">
          Proxy is used only for non-cluster communication.
        </small>

        <KubectlBinaries preferences={preferences}/>

        <h2>Helm</h2>
        <div className="flex gaps">
          <Select id="HelmRepoSelect"
            placeholder="Repositories"
            isLoading={this.helmLoading}
            isDisabled={this.helmLoading}
            options={this.helmOptions}
            onChange={this.onRepoSelect}
            formatOptionLabel={this.formatHelmOptionLabel}
            controlShouldRenderValue={false}
            className="box grow"
          />
          <Button
            primary
            label="Add Custom Helm Repo"
            onClick={AddHelmRepoDialog.open}
          />
        </div>
        <AddHelmRepoDialog onAddRepo={()=>this.loadHelmRepos()}/>
        <div className="repos flex gaps column">
          {Array.from(this.helmAddedRepos).map(([name, repo]) => {
            const tooltipId = `message-${name}`;

            return (
              <Badge key={name} className="added-repo flex gaps align-center justify-space-between">
                <span id={tooltipId} className="repo">{name}</span>
                <Icon
                  material="delete"
                  onClick={() => this.removeRepo(repo)}
                  tooltip="Remove"
                />
                <Tooltip targetId={tooltipId} formatters={{ narrow: true }}>
                  {repo.url}
                </Tooltip>
              </Badge>
            );
          })}
        </div>

        <h2>Auto start-up</h2>
        <Checkbox
          label="Automatically start Lens on login"
          value={preferences.openAtLogin}
          onChange={v => preferences.openAtLogin = v}
        />

        <h2>Certificate Trust</h2>
        <Checkbox
          label="Allow untrusted Certificate Authorities"
          value={preferences.allowUntrustedCAs}
          onChange={v => preferences.allowUntrustedCAs = v}
        />
        <small className="hint">
          This will make Lens to trust ANY certificate authority without any validations.{" "}
          Needed with some corporate proxies that do certificate re-writing.{" "}
          Does not affect cluster communications!
        </small>

        <div className="extensions flex column gaps">
          {appPreferenceRegistry.getItems().map(({ title, components: { Hint, Input } }, index) => {
            return (
              <div key={index} className="preference">
                <h2>{title}</h2>
                <Input/>
                <small className="hint">
                  <Hint/>
                </small>
              </div>
            );
          })}
        </div>
      </PageLayout>
    );
  }
}
