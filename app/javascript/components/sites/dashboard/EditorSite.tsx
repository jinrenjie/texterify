import { Icon, Pagination } from "antd";
import Search from "antd/lib/input/Search";
import * as _ from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { RouteComponentProps } from "react-router";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { KeysAPI } from "../../api/v1/KeysAPI";
import { LanguagesAPI } from "../../api/v1/LanguagesAPI";
import { ProjectsAPI } from "../../api/v1/ProjectsAPI";
import { history } from "../../routing/history";
import { Routes } from "../../routing/Routes";
import { dashboardStore } from "../../stores/DashboardStore";
import { Styles } from "../../ui/Styles";
import { TranslationCard } from "./editor/TranslationCard";

const Key = styled.div`
  /* background: ${(props) => props.index % 2 === 0 ? "#f8f8f8" : undefined}; */
  cursor: pointer;
  padding: 12px 16px;
  color: ${Styles.COLOR_SECONDARY};
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  border-bottom: 1px solid #e8e8e8;

  &:hover {
    color: ${Styles.COLOR_PRIMARY};
    background: #f0f1ff;
  }
`;

type IProps = {} & RouteComponentProps<{ projectId: string, keyId?: string }>;
type IState = {
  keysResponse: any;
  keyResponse: any;
  keysLoading: boolean;
  languagesResponse: any;
  selectedLanguageIdFrom: string;
  selectedLanguageIdTo: string;
  search: string;
  page: number;
};

@observer
class EditorSite extends React.Component<IProps, IState> {
  state: IState = {
    keysResponse: null,
    keyResponse: null,
    keysLoading: true,
    languagesResponse: null,
    selectedLanguageIdFrom: "",
    selectedLanguageIdTo: "",
    search: undefined,
    page: 1
  };

  debouncedSearchReloader: any = _.debounce((value) => {
    this.setState({ search: value, page: 0 }, this.fetchKeys);
  }, 500, { trailing: true });

  async componentDidMount() {
    const getProjectResponse = await ProjectsAPI.getProject(this.props.match.params.projectId);
    if (getProjectResponse.errors) {
      this.props.history.push(Routes.DASHBOARD.PROJECTS);
    } else {
      dashboardStore.currentProject = getProjectResponse.data;
    }

    await this.fetchKeys();

    const responseLanguages = await LanguagesAPI.getLanguages(this.props.match.params.projectId);

    this.setState({
      languagesResponse: responseLanguages
    });
  }

  fetchKeys = async (options?: any) => {
    options = options || {};
    options.search = options.search || this.state.search;
    options.page = options.page || this.state.page;
    options.perPage = 12;

    this.setState({ keysLoading: true });
    try {
      const responseKeys = await KeysAPI.getKeys(this.props.match.params.projectId, options);
      this.setState({
        keysResponse: responseKeys
      });
    } catch (err) {
      if (!err.isCanceled) {
        console.error(err);
      }
    }
    this.setState({ keysLoading: false });
  }

  onSearch = (event: any) => {
    this.debouncedSearchReloader(event.target.value);
  }

  async componentDidUpdate() {
    if (this.props.match.params.keyId && (!this.state.keyResponse || this.state.keyResponse.data.id !== this.props.match.params.keyId)) {
      await this.loadAndSetKey();
    }
  }

  loadAndSetKey = async () => {
    const keyResponse = await KeysAPI.getKey(this.props.match.params.projectId, this.props.match.params.keyId);

    if (keyResponse.data.id === this.props.match.params.keyId) {
      this.setState({
        keyResponse: keyResponse
      });
    }
  }

  keyLoaded = () => {
    return this.state.keyResponse && this.state.keyResponse.data.id === this.props.match.params.keyId;
  }

  isSelectedKey = (keyId: string) => {
    return this.props.match.params.keyId === keyId;
  }

  render(): JSX.Element {
    return (
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, background: "#fefeff" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 24px", background: "#fff", borderBottom: "1px solid #e8e8e8" }}>
          <Link to={Routes.DASHBOARD.PROJECT.replace(":projectId", this.props.match.params.projectId)}>
            <Icon type="arrow-left" />
            <span style={{ margin: "0 16px", paddingRight: 24, borderRight: "1px solid #e8e8e8" }}>
              Back to project
            </span>
          </Link>
          {dashboardStore.currentProject && dashboardStore.currentProject.attributes.name}
        </div>
        <div style={{ display: "flex", flexGrow: 1 }}>
          <div
            style={{ background: "#fff", display: "flex", flexDirection: "column", flexGrow: 1, maxWidth: 300, borderRight: "1px solid #e8e8e8" }}
          >
            <Search
              placeholder="Search keys and translations"
              onChange={this.onSearch}
              style={{ margin: 16, width: "auto" }}
            />
            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
              {!this.state.keysLoading && this.state.keysResponse && this.state.keysResponse.data.map((key, index) => {
                return (
                  <Key
                    key={key.id}
                    index={index}
                    onClick={() => {
                      history.push(
                        Routes.DASHBOARD.PROJECT_EDITOR_KEY
                          .replace(":projectId", this.props.match.params.projectId)
                          .replace(":keyId", key.id)
                      );
                    }}
                    style={{ background: this.isSelectedKey(key.id) ? Styles.COLOR_PRIMARY_LIGHT : undefined }}
                  >
                    {key.attributes.name}
                  </Key>
                );
              })}
              {this.state.keysLoading && <Icon type="loading" style={{ fontSize: 24, margin: "auto" }} spin />}
              {!this.state.keysLoading && this.state.keysResponse.data.length === 0 && <div style={{ margin: "auto", color: Styles.COLOR_TEXT_DISABLED, fontStyle: "italic" }}>
                No keys found.
              </div>}
            </div>
            <Pagination
              defaultCurrent={1}
              total={(this.state.keysResponse && this.state.keysResponse.meta.total) || 0}
              onChange={async (page: number, perPage: number) => {
                this.setState({ page: page }, this.fetchKeys);
              }}
              style={{ alignSelf: "center", margin: 16 }}
              size="small"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: 16 }}>
            {this.keyLoaded() && <div className="fade-in">
              <h2 style={{ fontSize: 16 }}>
                {this.state.keyResponse && this.state.keyResponse.data.attributes.name}
              </h2>
              <p>{this.state.keyResponse && this.state.keyResponse.data.attributes.description}</p>

              {this.state.languagesResponse &&
                <TranslationCard
                  projectId={this.props.match.params.projectId}
                  languagesResponse={this.state.languagesResponse}
                  defaultSelected={this.state.languagesResponse.data[0].id}
                  keyResponse={this.state.keyResponse}
                />
              }

              {this.state.languagesResponse && this.state.languagesResponse.data.length >= 2 &&
                <TranslationCard
                  projectId={this.props.match.params.projectId}
                  languagesResponse={this.state.languagesResponse}
                  defaultSelected={this.state.languagesResponse.data[1].id}
                  keyResponse={this.state.keyResponse}
                />
              }
            </div>}
            {!this.keyLoaded() && !this.props.match.params.keyId && <p style={{ color: Styles.COLOR_TEXT_DISABLED, fontStyle: "italic", margin: "auto" }}>
              Select a key from the left to start editing.
            </p>}
          </div>

          {/* <div
            style={{ padding: 16, background: "#fff", display: "flex", flexDirection: "column", flexGrow: 1, maxWidth: 320, borderLeft: "1px solid #e8e8e8" }}
          >
            <h3>Chat</h3>
            <p style={{ color: Styles.COLOR_TEXT_DISABLED, fontStyle: "italic" }}>No chat messages so far for this key.</p>
            <Comment
              avatar={
                <UserAvatar user={authStore.currentUser} />
              }
              author={authStore.currentUser && authStore.currentUser.username}
              content={
                <>
                  <TextArea autosize={{ minRows: 2, maxRows: 6 }} />
                  <Button htmlType="submit" type="primary" style={{ marginTop: 8 }}>
                    Send message
                  </Button>
                </>
              }
            />
          </div> */}
        </div>
      </div>
    );
  }
}

export { EditorSite };