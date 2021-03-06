/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { clusterRoleApi, Role, roleApi } from "../../api/endpoints";
import { autoBind } from "../../utils";
import { KubeObjectStore, KubeObjectStoreLoadingParams } from "../../kube-object.store";
import { apiManager } from "../../api/api-manager";

export class RolesStore extends KubeObjectStore<Role> {
  api = clusterRoleApi;

  constructor() {
    super();
    autoBind(this);
  }

  getSubscribeApis() {
    return [roleApi, clusterRoleApi];
  }

  protected sortItems(items: Role[]) {
    return super.sortItems(items, [
      role => role.kind,
      role => role.getName(),
    ]);
  }

  protected loadItem(params: { name: string; namespace?: string }) {
    if (params.namespace) return roleApi.get(params);

    return clusterRoleApi.get(params);
  }

  protected async loadItems(params: KubeObjectStoreLoadingParams): Promise<Role[]> {
    const items = await Promise.all([
      super.loadItems({ ...params, api: clusterRoleApi }),
      super.loadItems({ ...params, api: roleApi }),
    ]);

    return items.flat();
  }

  protected async createItem(params: { name: string; namespace?: string }, data?: Partial<Role>) {
    if (params.namespace) {
      return roleApi.create(params, data);
    } else {
      return clusterRoleApi.create(params, data);
    }
  }
}

export const rolesStore = new RolesStore();

apiManager.registerStore(rolesStore, [
  roleApi,
  clusterRoleApi,
]);
