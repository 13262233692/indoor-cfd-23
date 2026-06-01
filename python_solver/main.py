import json
import sys
import traceback

from geometry import build_mesh
from lbm_core import solve


def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except Exception as e:
        output_error(f"输入数据解析失败: {e}")
        sys.exit(1)

    geometry = input_data.get('geometry')
    params = input_data.get('params', {})

    if not geometry or not geometry.get('room'):
        output_error("缺少几何数据（geometry.room）")
        sys.exit(1)

    try:
        mesh = build_mesh(geometry)
    except ValueError as e:
        output_error(f"网格生成失败: {e}")
        sys.exit(1)
    except Exception as e:
        output_error(f"网格生成异常: {e}\n{traceback.format_exc()}")
        sys.exit(1)

    def progress_cb(p):
        msg = json.dumps({"type": "progress", "progress": round(p, 4)})
        print(msg, flush=True)

    try:
        result = solve(mesh, params, progress_callback=progress_cb)
    except Exception as e:
        output_error(f"求解器运行失败: {e}\n{traceback.format_exc()}")
        sys.exit(1)

    output = json.dumps({"type": "result", "data": result})
    print(output, flush=True)


def output_error(message):
    output = json.dumps({"type": "error", "error": message})
    print(output, flush=True)


if __name__ == '__main__':
    main()
