import hashlib
import importlib.util
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("transport", pathlib.Path(__file__).with_name("wave15-transport.py"))
transport = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transport)

class TransportTest(unittest.TestCase):
    def test_roundtrip_and_corruption_and_no_overwrite(self):
        data = b"fixture bytes for transport regression"
        transport.EXPECTED_BYTES = len(data)
        transport.EXPECTED_SHA = hashlib.sha256(data).hexdigest()
        transport.CHUNK = 8
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            original = root / "original.zip"
            original.write_bytes(data)
            parts = root / "parts"
            joined = root / "joined.zip"
            transport.split(original, parts)
            transport.join(parts, joined)
            self.assertEqual(joined.read_bytes(), data)
            self.assertEqual(original.read_bytes(), data)
            with self.assertRaises(FileExistsError):
                transport.split(original, parts)
            with self.assertRaises(FileExistsError):
                transport.join(parts, joined)
            part = parts / "wave15.part001"
            part.write_bytes(b"x" * 8)
            with self.assertRaises(ValueError):
                transport.join(parts, root / "corrupt.zip")
            self.assertFalse((root / "corrupt.zip").exists())
            self.assertEqual(original.read_bytes(), data)

if __name__ == "__main__":
    unittest.main()
