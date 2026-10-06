import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType
} from '../firebase';

export interface SavedDatasetRecord {
  id: string;
  userId: string;
  datasetId?: string;
  name: string;
  description?: string;
  targetProject?: string;
  format?: string;
  sampleCount?: number;
  tags?: string[];
  learningData?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConnectedHfProject {
  id: string;
  userId: string;
  repoName: string;
  repoType?: 'dataset' | 'model' | 'space';
  description?: string;
  defaultFormat?: string;
  isDefaultTarget?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DatasetSnapshotRecord {
  id: string;
  userId: string;
  datasetId: string;
  datasetName?: string;
  label: string;
  numRows: number;
  size?: string;
  features?: { name: string; type: string }[];
  distributionMetrics?: Record<string, any>;
  sampleRows?: any[];
  createdAt: string;
  updatedAt?: string;
}

interface FirebaseAuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  savedDatasets: SavedDatasetRecord[];
  connectedProjects: ConnectedHfProject[];
  datasetSnapshots: DatasetSnapshotRecord[];
  saveDataset: (data: Omit<SavedDatasetRecord, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  deleteSavedDataset: (id: string) => Promise<void>;
  connectHfProject: (data: Omit<ConnectedHfProject, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  disconnectHfProject: (id: string) => Promise<void>;
  captureSnapshot: (data: Omit<DatasetSnapshotRecord, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  deleteSnapshot: (id: string) => Promise<void>;
  isSaving: boolean;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | null>(null);

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedDatasets, setSavedDatasets] = useState<SavedDatasetRecord[]>([]);
  const [connectedProjects, setConnectedProjects] = useState<ConnectedHfProject[]>([]);
  const [datasetSnapshots, setDatasetSnapshots] = useState<DatasetSnapshotRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Upsert user profile document
        const userRef = doc(db, 'users', currentUser.uid);
        const userPath = `users/${currentUser.uid}`;
        try {
          const userSnap = await getDoc(userRef);
          const now = new Date().toISOString();
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              userId: currentUser.uid,
              email: currentUser.email || 'user@example.com',
              displayName: currentUser.displayName || 'AI Researcher',
              photoURL: currentUser.photoURL || '',
              createdAt: now,
              updatedAt: now
            });
          } else {
            await setDoc(userRef, {
              ...userSnap.data(),
              email: currentUser.email || userSnap.data()?.email,
              displayName: currentUser.displayName || userSnap.data()?.displayName,
              photoURL: currentUser.photoURL || userSnap.data()?.photoURL,
              updatedAt: now
            }, { merge: true });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, userPath);
        }

        // Real-time listener for saved datasets
        const datasetsPath = `users/${currentUser.uid}/saved_datasets`;
        const datasetsCol = collection(db, 'users', currentUser.uid, 'saved_datasets');
        const unsubDatasets = onSnapshot(datasetsCol, (snapshot) => {
          const items: SavedDatasetRecord[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as SavedDatasetRecord);
          });
          setSavedDatasets(items);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, datasetsPath);
        });

        // Real-time listener for connected projects
        const projectsPath = `users/${currentUser.uid}/connected_projects`;
        const projectsCol = collection(db, 'users', currentUser.uid, 'connected_projects');
        const unsubProjects = onSnapshot(projectsCol, (snapshot) => {
          const items: ConnectedHfProject[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as ConnectedHfProject);
          });
          setConnectedProjects(items);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, projectsPath);
        });

        // Real-time listener for dataset snapshots
        const snapshotsPath = `users/${currentUser.uid}/dataset_snapshots`;
        const snapshotsCol = collection(db, 'users', currentUser.uid, 'dataset_snapshots');
        const unsubSnapshots = onSnapshot(snapshotsCol, (snapshot) => {
          const items: DatasetSnapshotRecord[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as DatasetSnapshotRecord);
          });
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setDatasetSnapshots(items);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, snapshotsPath);
        });

        return () => {
          unsubDatasets();
          unsubProjects();
          unsubSnapshots();
        };
      } else {
        setSavedDatasets([]);
        setConnectedProjects([]);
        setDatasetSnapshots([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      alert(`Sign in error: ${err.message}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const saveDataset = async (data: Omit<SavedDatasetRecord, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
    if (!user) {
      alert('Please sign in to save datasets to your account.');
      throw new Error('User not authenticated');
    }

    setIsSaving(true);
    const newId = `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `users/${user.uid}/saved_datasets/${newId}`;
    const now = new Date().toISOString();

    const record: SavedDatasetRecord = {
      ...data,
      id: newId,
      userId: user.uid,
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'saved_datasets', newId), record);
      return newId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSavedDataset = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/saved_datasets/${id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'saved_datasets', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const connectHfProject = async (data: Omit<ConnectedHfProject, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
    if (!user) {
      alert('Please sign in to connect Hugging Face projects.');
      throw new Error('User not authenticated');
    }

    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `users/${user.uid}/connected_projects/${newId}`;
    const now = new Date().toISOString();

    const projectRecord: ConnectedHfProject = {
      ...data,
      id: newId,
      userId: user.uid,
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'connected_projects', newId), projectRecord);
      return newId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      throw err;
    }
  };

  const disconnectHfProject = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/connected_projects/${id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'connected_projects', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const captureSnapshot = async (data: Omit<DatasetSnapshotRecord, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
    if (!user) {
      alert('Please sign in with Google to capture and store dataset snapshots in Firestore.');
      throw new Error('User not authenticated');
    }

    const newId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `users/${user.uid}/dataset_snapshots/${newId}`;
    const now = new Date().toISOString();

    const snapshotRecord: any = {
      id: newId,
      userId: user.uid,
      datasetId: data.datasetId.slice(0, 200),
      label: (data.label || 'Snapshot Baseline').slice(0, 100),
      numRows: Math.max(0, data.numRows || 0),
      createdAt: now,
      updatedAt: now
    };

    if (data.datasetName) snapshotRecord.datasetName = data.datasetName.slice(0, 150);
    if (data.size) snapshotRecord.size = data.size.slice(0, 50);
    if (data.features && Array.isArray(data.features)) snapshotRecord.features = data.features.slice(0, 100);
    if (data.distributionMetrics && typeof data.distributionMetrics === 'object') snapshotRecord.distributionMetrics = data.distributionMetrics;
    if (data.sampleRows && Array.isArray(data.sampleRows)) snapshotRecord.sampleRows = data.sampleRows.slice(0, 50);

    try {
      await setDoc(doc(db, 'users', user.uid, 'dataset_snapshots', newId), snapshotRecord);
      return newId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      throw err;
    }
  };

  const deleteSnapshot = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/dataset_snapshots/${id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'dataset_snapshots', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      throw err;
    }
  };

  return (
    <FirebaseAuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        logout,
        savedDatasets,
        connectedProjects,
        datasetSnapshots,
        saveDataset,
        deleteSavedDataset,
        connectHfProject,
        disconnectHfProject,
        captureSnapshot,
        deleteSnapshot,
        isSaving
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};
