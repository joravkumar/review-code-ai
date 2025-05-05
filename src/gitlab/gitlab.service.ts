import axios, { AxiosInstance } from 'axios';

export interface GitLabChange {
  new_path: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

export interface CommentPosition {
  base_sha: string;
  start_sha: string;
  head_sha: string;
  position_type: 'text';
  new_path: string;
  new_line: number;
  new_content: string;
}

export interface GitLabComment {
  body: string;
  position: Omit<CommentPosition, 'new_content'>;
}

export class GitLabService {
  private api: AxiosInstance;
  private projectId: string;

  constructor(private token: string, projectId: string) {
    this.projectId = encodeURIComponent(projectId);
    this.api = axios.create({
      baseURL: 'https://gitlab.com/api/v4',
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json',
      },
    });
  }

  async getMergeRequestChanges(mergeRequestId: string): Promise<GitLabChange[]> {
    const url = `/projects/${this.projectId}/merge_requests/${mergeRequestId}/changes`;
    const response = await this.api.get(url);
    return response.data.changes || [];
  }

  async addReviewComment(
    position: CommentPosition,
    change: GitLabChange,
    comment: string,
    mergeRequestId: string
  ): Promise<void> {
    const url = `/projects/${this.projectId}/merge_requests/${mergeRequestId}/discussions`;
    
    const { new_content, ...positionWithoutContent } = position;
    
    await this.api.post(url, {
      body: comment,
      position: positionWithoutContent,
    });
  }
}
