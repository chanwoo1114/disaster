import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple


class ProjectStorage:
    """JSONL 기반 프로젝트 저장"""

    def __init__(self, path: str = None, max_per_count: int = 1000):
        if path is None:
            base_dir = Path(__file__).parent
            self.data_dir = base_dir / "../data/project"
        else:
            self.data_dir = Path(path)

        self.data_dir.mkdir(exist_ok=True, parents=True)
        self.max_per_count = max_per_count
        self.metadata_file = self.data_dir / "metadata.json"
        self._init_metadata()

    def _init_metadata(self):
        """메타데이터 초기화"""
        if not self.metadata_file.exists():
            metadata = {"current_batch": 1, "current_count": 0, "last_id": 0}
            self._save_metadata(metadata)

    def _load_metadata(self) -> dict:
        """메타데이터 로드"""
        try:
            with open(self.metadata_file, "r", encoding="utf-8") as f:
                return json.load(f)

        except:
            return {"current_batch": 1, "current_count": 0, "last_id": 0}

    def _save_metadata(self, metadata: dict):
        """메타데이터 저장"""
        with open(self.metadata_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

    def _get_batch_folder(self, batch_num: str) -> Path:
        """배치 폴더 경로"""
        folder = self.data_dir / batch_num
        folder.mkdir(exist_ok=True, parents=True)
        return folder

    def _get_batch_file(self, batch_num: str) -> Path:
        """배치 JSONL 파일 경로"""
        return self._get_batch_folder(batch_num) / "project.jsonl"

    def _get_next_id(self) -> int:
        metadata = self._load_metadata()
        next_id = metadata["last_id"] + 1
        metadata["last_id"] = next_id
        self._save_metadata(metadata)
        return next_id

    def save_project(self, project: dict) -> bool:
        """프로젝트 저장"""
        try:
            metadata = self._load_metadata()
            current_batch = metadata["current_batch"]
            current_count = metadata["current_count"]

            if current_count >= self.max_per_count:
                current_batch += 1
                current_count = 0

            if "id" not in project:
                project["id"] = metadata["last_id"] + 1
                metadata["last_id"] = project["id"]

            if "created_at" not in project:
                project["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                project["is_deleted"] = False

            file_path = self._get_batch_file(str(current_batch))
            with open(file_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(project, ensure_ascii=False, default=str) + "\n")

            metadata["current_batch"] = current_batch
            metadata["current_count"] = current_count + 1

            self._save_metadata(metadata)

            return True

        except Exception as e:
            print(e)
            return False

    def load_project_list(
        self, skip: int = 0, limit: int = 12
    ) -> Tuple[List[dict], bool]:
        """시나리오 목록 조회"""
        load_projects = []
        skipped = 0

        batch_folders = sorted(
            self.data_dir.glob("[0-9]*"), key=lambda x: int(x.name), reverse=True
        )

        for folder in batch_folders:
            if len(load_projects) >= limit:
                break

            file_path = folder / "project.jsonl"
            if not file_path.exists():
                continue

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = [line for line in f if line.strip()]

                    for line in reversed(lines):
                        if len(load_projects) >= limit:
                            break

                        project = json.loads(line)

                        if project.get("is_deleted", False):
                            continue

                        if skipped < skip:
                            skipped += 1
                            continue
                        print(project)
                        print(skip)
                        print(skipped)
                        load_projects.append(project)

            except Exception as e:
                print(e)

        return load_projects

    def load_project_by_id(self, project_id: int) -> Optional[dict]:
        """ID로 프로젝트 조회"""
        batch_num = (project_id - 1) // self.max_per_count + 1

        file_path = self._get_batch_file(str(batch_num))

        if not file_path.exists():
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = [line for line in f if line.strip()]

            for line in reversed(lines):
                project = json.loads(line)

                if project["id"] == project_id:
                    return project

        except Exception as e:
            print(e)
            return None
