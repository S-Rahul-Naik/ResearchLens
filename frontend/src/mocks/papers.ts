export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  topics: string[];
  keywords: string[];
  status: 'processed' | 'pending' | 'processing' | 'error';
  uploadDate: string;
  cloudinaryUrl?: string;
  embedding?: number[];
}

export const mockPapers: Paper[] = [
  {
    "id": "p001",
    "title": "Communication-Efficient Learning of Deep Networks",
    "authors": [
      "H. Brendan McMahan Eider Moore Daniel Ramage Seth Hampson Blaise Ag ¨uera y Arcas"
    ],
    "year": 2023,
    "abstract": "Modern mobile devices have access to a wealth of data suitable for learning models, which in turn can greatly improve the user experience on the device. For example, language models can im- prove speech recognition and text entry, and im- age models can automatically select good photos. However, this rich data is often privacy sensitive, large in quantity, or both, which may preclude logging to the data center and training there using conventional approaches. We advocate an alter- native that leaves the training data distributed on the mobile devices, and learns a shared model by aggregating locally-computed updates. We term this decentralized approach Federated Learning. We present a practical method for the federated learning of deep networks based on iterative model averaging, and conduct an extensive empiri- cal evaluation, considering five different model ar- chitectures and four datasets. These experiments demonstrate the approach is robust to the unbal- anced and non-IID data distributions that are a defining characteristic of this setting. Commu- nication costs are the principal constraint, and we show a reduction in required communication rounds by 10–100× as compared to synchronized stochastic gradient descent. 1",
    "topics": [
      "t001"
    ],
    "keywords": [
      "federated",
      "learning"
    ],
    "status": "processed",
    "uploadDate": "2026-05-01"
  },
  {
    "id": "p002",
    "title": "FEDERATED OPTIMIZATION IN HETEROGENEOUS NETWORKS",
    "authors": [
      "Tian Li 1 Anit Kumar Sahu 2 Manzil Zaheer 3 Maziar Sanjabi 4 Ameet Talwalkar 1 5 Virginia Smith 1"
    ],
    "year": 2020,
    "abstract": "Federated Learning is a distributed learning paradigm with two key challenges that differentiate it from traditional distributed optimization: (1) significant variability in terms of the systems characteristics on each device in the network (systems heterogeneity), and (2) non-identically distributed data across the network (statistical heterogeneity). In this work, we introduce a framework, FedProx, to tackle heterogeneity in federated networks. FedProx can be viewed as a generalization and re-parametrization of FedAvg, the current state-of-the-art method for federated learning. While this re-parameterization makes only minor modifications to the method itself, these modifications have important ramifications both in theory and in practice. Theoretically, we provide convergence guarantees for our framework when learning over data from non-identical distributions (statistical heterogeneity), and while adhering to device-level systems constraints by allowing each participating device to perform a variable amount of work (systems heterogeneity). Practically, we demonstrate that FedProx allows for more robust convergence than FedAvg across a suite of realistic federated datasets. In particular, in highly heterogeneous settings, FedProx demonstrates significantly more stable and accurate convergence behavior relative to FedAvg—improving absolute test accuracy by 22% on average. 1",
    "topics": [
      "t001"
    ],
    "keywords": [
      "federated",
      "learning"
    ],
    "status": "processed",
    "uploadDate": "2026-05-02"
  },
  {
    "id": "p003",
    "title": "Survey of Personalization Techniques for Federated Learning",
    "authors": [
      "Viraj Kulkarni1",
      "Milind Kulkarni1",
      "Aniruddha Pant2"
    ],
    "year": 2020,
    "abstract": "Federated learning enables machine learning mod- els to learn from private decentralized data without compromising privacy. The standard formulation of federated learning produces one shared model for all clients. Statistical heterogeneity due to non- IID distribution of data across devices often leads to scenarios where, for some clients, the local mod- els trained solely on their private data perform bet- ter than the global shared model thus taking away their incentive to participate in the process. Sev- eral techniques have been proposed to personalize global models to work better for individual clients. This paper highlights the need for personalization and surveys recent research on this topic. 1",
    "topics": [
      "t001"
    ],
    "keywords": [
      "federated",
      "learning"
    ],
    "status": "processed",
    "uploadDate": "2026-05-03"
  },
  {
    "id": "p004",
    "title": "FLOWER: A FRIENDLY FEDERATED LEARNING FRAMEWORK",
    "authors": [
      "Daniel J. Beutel 1 2 Taner Topal 1 2 Akhil Mathur 3 Xinchi Qiu 1 Javier Fernandez-Marques 4 Yan Gao 1"
    ],
    "year": 2022,
    "abstract": "Federated Learning (FL) has emerged as a promising technique for edge devices to collaboratively learn a shared prediction model, while keeping their training data on the device, thereby decoupling the ability to do machine learning from the need to store the data in the cloud. However, FL is difficult to implement realistically, both in terms of scale and systems heterogeneity. Although there are a number of research frameworks available to simulate FL algorithms, they do not support the study of scalable FL workloads on heterogeneous edge devices. In this paper, we present Flower – a comprehensive FL framework that distinguishes itself from existing platforms by offering new facilities to execute large-scale FL experiments, and consider richly heterogeneous FL device scenarios. Our experiments show Flower can perform FL experiments up to 15M in client size using only a pair of high-end GPUs. Researchers can then seamlessly migrate experiments to real devices to examine other parts of the design space. We believe Flower provides the community a critical new tool for FL study and development. 1",
    "topics": [
      "t001"
    ],
    "keywords": [
      "federated",
      "learning"
    ],
    "status": "processed",
    "uploadDate": "2026-05-04"
  },
  {
    "id": "p005",
    "title": "NLO QCD corrections to the processes pp → ZZ",
    "authors": [
      "K.Djamaa",
      "a A. Mohamed- Meziania"
    ],
    "year": 2020,
    "abstract": ": We propose an implementation of ZZ, ZZj and ZZjj productions in MadGraph5 _aMC@NLO framework at √s = 14 TeV. We calculate these processes at leading order and next-to-leading order with QCD corrections and we present a theoretical prediction of their total cross sections with different cuts in transverse momentum of jets, including gluon fusion contributions. In the same time we estimate their theoretical uncertainty. We discuss the various kinematical distributions spectrums at partonic level and hadronic level applying the showering and hadronization using Pythia8. In order to reconstruct the events similar to that found at LHC, we use the ATLAS cards and the fast detector simulation Delphes. arXiv:2012.04235v1 [hep-ph] 8 Dec 2020 -- 1 of 15 -- Contents 1",
    "topics": [
      "t001"
    ],
    "keywords": [
      "federated",
      "learning"
    ],
    "status": "processed",
    "uploadDate": "2026-05-05"
  },
  {
    "id": "p006",
    "title": "Language Models are Few-Shot Learners",
    "authors": [
      "Tom B. Brown∗ Benjamin Mann∗ Nick Ryder∗ Melanie Subbiah∗"
    ],
    "year": 2020,
    "abstract": "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this method still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. By contrast, humans can generally perform a new language task from only a few examples or from simple instructions – something which current NLP systems still largely struggle to do. Here we show that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine- tuning approaches. Specifically, we train GPT-3, an autoregressive language model with 175 billion parameters, 10x more than any previous non-sparse language model, and test its performance in the few-shot setting. For all tasks, GPT-3 is applied without any gradient updates or fine-tuning, with tasks and few-shot demonstrations specified purely via text interaction with the model. GPT-3 achieves strong performance on many NLP datasets, including translation, question-answering, and cloze tasks, as well as several tasks that require on-the-fly reasoning or domain adaptation, such as unscrambling words, using a novel word in a sentence, or performing 3-digit arithmetic. At the same time, we also identify some datasets where GPT-3’s few-shot learning still struggles, as well as some datasets where GPT-3 faces methodological issues related to training on large web corpora. Finally, we find that GPT-3 can generate samples of news articles which human evaluators have difficulty distinguishing from articles written by humans. We discuss broader societal impacts of this finding and of GPT-3 in general. ∗Equal contribution †Johns Hopkins University, OpenAI Author contributions listed at end of paper. arXiv:2005.14165v4 [cs.CL] 22 Jul 2020 -- 1 of 75 -- Contents 1",
    "topics": [
      "t002"
    ],
    "keywords": [
      "large",
      "language",
      "models"
    ],
    "status": "processed",
    "uploadDate": "2026-05-06"
  },
  {
    "id": "p007",
    "title": "Chain-of-Thought Prompting Elicits Reasoning",
    "authors": [
      "Jason Wei Xuezhi Wang Dale Schuurmans Maarten Bosma"
    ],
    "year": 2023,
    "abstract": "We explore how generating a chain of thought—a series of intermediate reasoning steps—significantly improves the ability of large language models to perform complex reasoning. In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain-of- thought prompting, where a few chain of thought demonstrations are provided as exemplars in prompting. Experiments on three large language models show that chain-of-thought prompting improves performance on a range of arithmetic, commonsense, and symbolic reasoning tasks. The empirical gains can be striking. For instance, prompting a PaLM 540B with just eight chain-of-thought exemplars achieves state-of-the-art accuracy on the GSM8K benchmark of math word problems, surpassing even finetuned GPT-3 with a verifier. A: The cafeteria had 23 apples originally. They used 20 to make lunch. So they had 23 - 20 = 3. They bought 6 more apples, so they have 3 + 6 = 9. The answer is 9. Chain-of-Thought Prompting Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 tennis balls. How many tennis balls does he have now? A: The answer is 1",
    "topics": [
      "t002"
    ],
    "keywords": [
      "large",
      "language",
      "models"
    ],
    "status": "processed",
    "uploadDate": "2026-05-07"
  },
  {
    "id": "p008",
    "title": "Training language models to follow instructions",
    "authors": [
      "Long Ouyang∗ Jeff Wu∗ Xu Jiang∗ Diogo Almeida∗ Carroll L. Wainwright∗"
    ],
    "year": 2022,
    "abstract": "Making language models bigger does not inherently make them better at following a user’s intent. For example, large language models can generate outputs that are untruthful, toxic, or simply not helpful to the user. In other words, these models are not aligned with their users. In this paper, we show an avenue for aligning language models with user intent on a wide range of tasks by fine-tuning with human feedback. Starting with a set of labeler-written prompts and prompts submitted through the OpenAI API, we collect a dataset of labeler demonstrations of the desired model behavior, which we use to fine-tune GPT-3 using supervised learning. We then collect a dataset of rankings of model outputs, which we use to further fine-tune this supervised model using reinforcement learning from human feedback. We call the resulting models InstructGPT. In human evaluations on our prompt distribution, outputs from the",
    "topics": [
      "t002"
    ],
    "keywords": [
      "large",
      "language",
      "models"
    ],
    "status": "processed",
    "uploadDate": "2026-05-08"
  },
  {
    "id": "p009",
    "title": "LLaMA: Open and Efficient Foundation Language Models Hugo Touvron∗",
    "authors": [
      "Hugo Touvron∗"
    ],
    "year": 2023,
    "abstract": "We introduce LLaMA, a collection of founda- tion language models ranging from 7B to 65B parameters. We train our models on trillions of tokens, and show that it is possible to train state-of-the-art models using publicly avail- able datasets exclusively, without resorting to proprietary and inaccessible datasets. In particular, LLaMA-13B outperforms GPT-3 (175B) on most benchmarks, and LLaMA- 65B is competitive with the best models, Chinchilla-70B and PaLM-540B. We release all our models to the research community",
    "topics": [
      "t002"
    ],
    "keywords": [
      "large",
      "language",
      "models"
    ],
    "status": "processed",
    "uploadDate": "2026-05-09"
  },
  {
    "id": "p010",
    "title": "Llama 2: Open Foundation and Fine-Tuned Chat Models",
    "authors": [
      "Hugo Touvron∗ Louis Martin† Kevin Stone†"
    ],
    "year": 2023,
    "abstract": "In this work, we develop and release Llama 2, a collection of pretrained and fine-tuned large language models (LLMs) ranging in scale from 7 billion to 70 billion parameters. Our fine-tuned LLMs, called Llama 2-Chat, are optimized for dialogue use cases. Our models outperform open-source chat models on most benchmarks we tested, and based on our human evaluations for helpfulness and safety, may be a suitable substitute for closed- source models. We provide a detailed description of our approach to fine-tuning and safety improvements of Llama 2-Chat in order to enable the community to build on our work and contribute to the responsible development of LLMs. ∗Equal contribution, corresponding authors: {tscialom, htouvron}@meta.com †Second author Contributions for all the authors can be found in Section A.",
    "topics": [
      "t002"
    ],
    "keywords": [
      "large",
      "language",
      "models"
    ],
    "status": "processed",
    "uploadDate": "2026-05-10"
  },
  {
    "id": "p011",
    "title": "U-Net: Convolutional Networks for Biomedical Image Segmentation",
    "authors": [
      "Image Segmentation"
    ],
    "year": 2015,
    "abstract": ". There is large consent that successful training of deep net- works requires many thousand annotated training samples. In this pa- per, we present a network and training strategy that relies on the strong use of data augmentation to use the available annotated samples more efficiently. The architecture consists of a contracting path to capture context and a symmetric expanding path that enables precise localiza- tion. We show that such a network can be trained end-to-end from very few images and outperforms the prior best method (a sliding-window convolutional network) on the ISBI challenge for segmentation of neu- ronal structures in electron microscopic stacks. Using the same net- work trained on transmitted light microscopy images (phase contrast and DIC) we won the ISBI cell tracking challenge 2015 in these cate- gories by a large margin. Moreover, the network is fast. Segmentation of a 512x512 image takes less than a second on a recent GPU. The full implementation (based on Caffe) and the trained networks are available at http://lmb.informatik.uni-freiburg.de/people/ronneber/u-net. 1",
    "topics": [
      "t003"
    ],
    "keywords": [
      "computer",
      "vision",
      "medical",
      "imaging"
    ],
    "status": "processed",
    "uploadDate": "2026-05-11"
  },
  {
    "id": "p012",
    "title": "Deep Residual Learning for Image Recognition",
    "authors": [
      "Kaiming He Xiangyu Zhang Shaoqing Ren Jian Sun"
    ],
    "year": 2015,
    "abstract": "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learn- ing residual functions with reference to the layer inputs, in- stead of learning unreferenced functions. We provide com- prehensive empirical evidence showing that these residual networks are easier to optimize, and can gain accuracy from considerably increased depth. On the ImageNet dataset we evaluate residual nets with a depth of up to 152 layers—8× deeper than VGG nets [41] but still having lower complex- ity. An ensemble of these residual nets achieves 3.57% error on the ImageNet test set. This result won the 1st place on the ILSVRC 2015 classification task. We also present analysis on CIFAR-10 with 100 and 1000 layers. The depth of representations is of central importance for many visual recognition tasks. Solely due to our ex- tremely deep representations, we obtain a 28% relative im- provement on the COCO object detection dataset. Deep residual nets are foundations of our submissions to ILSVRC & COCO 2015 competitions1, where we also won the 1st places on the tasks of ImageNet detection, ImageNet local- ization, COCO detection, and COCO segmentation.",
    "topics": [
      "t003"
    ],
    "keywords": [
      "computer",
      "vision",
      "medical",
      "imaging"
    ],
    "status": "processed",
    "uploadDate": "2026-05-12"
  },
  {
    "id": "p013",
    "title": "AN IMAGE IS WORTH 16X16 WORDS:",
    "authors": [
      "Alexey Dosovitskiy∗",
      "Lucas Beyer∗",
      "Alexander Kolesnikov∗",
      "Dirk Weissenborn∗"
    ],
    "year": 2021,
    "abstract": "While the Transformer architecture has become the de-facto standard for natural language processing tasks, its applications to computer vision remain limited. In vision, attention is either applied in conjunction with convolutional networks, or used to replace certain components of convolutional networks while keeping their overall structure in place. We show that this reliance on CNNs is not necessary and a pure transformer applied directly to sequences of image patches can perform very well on image classification tasks. When pre-trained on large amounts of data and transferred to multiple mid-sized or small image recognition benchmarks (ImageNet, CIFAR-100, VTAB, etc.), Vision Transformer (ViT) attains excellent results compared to state-of-the-art convolutional networks while requiring sub- stantially fewer computational resources to train.1 1",
    "topics": [
      "t003"
    ],
    "keywords": [
      "computer",
      "vision",
      "medical",
      "imaging"
    ],
    "status": "processed",
    "uploadDate": "2026-05-13"
  },
  {
    "id": "p014",
    "title": "Learning Transferable Visual Models From Natural Language Supervision",
    "authors": [
      "Alec Radford * 1 Jong Wook Kim * 1 Chris Hallacy 1 Aditya Ramesh 1 Gabriel Goh 1 Sandhini Agarwal 1"
    ],
    "year": 2021,
    "abstract": "State-of-the-art computer vision systems are trained to predict a fixed set of predetermined object categories. This restricted form of super- vision limits their generality and usability since additional labeled data is needed to specify any other visual concept. Learning directly from raw text about images is a promising alternative which leverages a much broader source of supervision. We demonstrate that the simple pre-training task of predicting which caption goes with which im- age is an efficient and scalable way to learn SOTA image representations from scratch on a dataset of 400 million (image, text) pairs collected from the internet. After pre-training, natural language is used to reference learned visual concepts (or describe new ones) enabling zero-shot transfer of the model to downstream tasks. We study the performance of this approach by benchmark- ing on over 30 different existing computer vi- sion datasets, spanning tasks such as OCR, ac- tion recognition in videos, geo-localization, and many types of fine-grained object classification. The model transfers non-trivially to most tasks and is often competitive with a fully supervised baseline without the need for any dataset spe- cific training. For instance, we match the ac- curacy of the original ResNet-50 on ImageNet zero-shot without needing to use any of the",
    "topics": [
      "t003"
    ],
    "keywords": [
      "computer",
      "vision",
      "medical",
      "imaging"
    ],
    "status": "processed",
    "uploadDate": "2026-05-14"
  },
  {
    "id": "p015",
    "title": "Masked Autoencoders Are Scalable Vision Learners",
    "authors": [
      "Kaiming He∗",
      "† Xinlei Chen∗ Saining Xie Yanghao Li Piotr Doll´ar Ross Girshick"
    ],
    "year": 2021,
    "abstract": "This paper shows that masked autoencoders (MAE) are scalable self-supervised learners for computer vision. Our MAE approach is simple: we mask random patches of the input image and reconstruct the missing pixels. It is based on two core designs. First, we develop an asymmetric encoder-decoder architecture, with an encoder that oper- ates only on the visible subset of patches (without mask to- kens), along with a lightweight decoder that reconstructs the original image from the latent representation and mask tokens. Second, we find that masking a high proportion of the input image, e.g., 75%, yields a nontrivial and meaningful self-supervisory task. Coupling these two de- signs enables us to train large models efficiently and ef- fectively: we accelerate training (by 3× or more) and im- prove accuracy. Our scalable approach allows for learning high-capacity models that generalize well: e.g., a vanilla ViT-Huge model achieves the best accuracy (87.8%) among methods that use only ImageNet-1K data. Transfer per- formance in downstream tasks outperforms supervised pre- training and shows promising scaling behavior.",
    "topics": [
      "t003"
    ],
    "keywords": [
      "computer",
      "vision",
      "medical",
      "imaging"
    ],
    "status": "processed",
    "uploadDate": "2026-05-15"
  },
  {
    "id": "p016",
    "title": "EMBEDDING ENTITIES AND RELATIONS FOR LEARN-",
    "authors": [
      "Bishan Yang1˚"
    ],
    "year": 2015,
    "abstract": "We consider learning representations of entities and relations in KBs using the neural-embedding approach. We show that most existing models, including NTN (Socher et al., 2013) and TransE (Bordes et al., 2013b), can be generalized under a unified learning framework, where entities are low-dimensional vectors learned from a neural network and relations are bilinear and/or linear mapping functions. Under this framework, we compare a variety of embedding models on the link prediction task. We show that a simple bilinear formulation achieves new state-of-the-art results for the task (achieving a top-10 accuracy of 73.2% vs. 54.7% by TransE on Freebase). Furthermore, we introduce a novel ap- proach that utilizes the learned relation embeddings to mine logical rules such as BornInCitypa, bq ^ CityInCountrypb, cq ùñ N ationalitypa, cq. We find that embeddings learned from the bilinear objective are particularly good at capturing relational semantics, and that the composition of relations is char- acterized by matrix multiplication. More interestingly, we demonstrate that our embedding-based rule extraction approach successfully outperforms a state-of- the-art confidence-based rule mining approach in mining Horn rules that involve compositional reasoning. 1",
    "topics": [
      "t005"
    ],
    "keywords": [
      "knowledge",
      "graphs"
    ],
    "status": "processed",
    "uploadDate": "2026-05-16"
  },
  {
    "id": "p017",
    "title": "Task-Oriented Dialog Systems that Consider Multiple Appropriate Responses",
    "authors": [
      "Yichi Zhang∗"
    ],
    "year": 2019,
    "abstract": "Conversations have an intrinsic one-to-many property, which means that multiple responses can be appropriate for the same dialog context. In task-oriented dialogs, this property leads to different valid dialog policies towards task completion. However, none of the existing task-oriented dialog genera- tion approaches takes this property into account. We propose a Multi-Action Data Augmentation (MADA) framework to utilize the one-to-many property to generate diverse appropri- ate dialog responses. Specifically, we first use dialog states to summarize the dialog history, and then discover all possible mappings from every dialog state to its different valid system actions. During dialog system training, we enable the current dialog state to map to all valid system actions discovered in the previous process to create additional state-action pairs. By incorporating these additional pairs, the dialog policy learns a balanced action distribution, which further guides the dia- log model to generate diverse responses. Experimental results show that the proposed framework consistently improves di- alog policy diversity, and results in improved response diver- sity and appropriateness. Our model obtains state-of-the-art results on MultiWOZ.",
    "topics": [
      "t005"
    ],
    "keywords": [
      "knowledge",
      "graphs"
    ],
    "status": "processed",
    "uploadDate": "2026-05-17"
  },
  {
    "id": "p018",
    "title": "A Survey on Knowledge Graphs:",
    "authors": [
      "Representation",
      "Acquisition",
      "Applications"
    ],
    "year": 2021,
    "abstract": "—Human knowledge provides a formal understand- ing of the world. Knowledge graphs that represent structural relations between entities have become an increasingly popular research direction towards cognition and human-level intelligence. In this survey, we provide a comprehensive review of knowledge graph covering overall research topics about 1) knowledge graph representation learning, 2) knowledge acquisition and completion, 3) temporal knowledge graph, and 4) knowledge-aware appli- cations, and summarize recent breakthroughs and perspective directions to facilitate future research. We propose a full-view categorization and new taxonomies on these topics. Knowledge graph embedding is organized from four aspects of representation space, scoring function, encoding models, and auxiliary infor- mation. For knowledge acquisition, especially knowledge graph completion, embedding methods, path inference, and logical rule reasoning, are reviewed. We further explore several emerging top- ics, including meta relational learning, commonsense reasoning, and temporal knowledge graphs. To facilitate future research on knowledge graphs, we also provide a curated collection of datasets and open-source libraries on different tasks. In the end, we have a thorough outlook on several promising research directions. Index Terms—Knowledge graph, representation learning, knowledge graph completion, relation extraction, reasoning, deep learning. I.",
    "topics": [
      "t005"
    ],
    "keywords": [
      "knowledge",
      "graphs"
    ],
    "status": "processed",
    "uploadDate": "2026-05-18"
  },
  {
    "id": "p019",
    "title": "Case-Based Reasoning for Natural Language Queries",
    "authors": [
      "Rajarshi Das1",
      "Manzil Zaheer3",
      "Dung Thai1",
      "Ameya Godbole1",
      "Ethan Perez2"
    ],
    "year": 2021,
    "abstract": "It is often challenging to solve a complex prob- lem from scratch, but much easier if we can access other similar problems with their solu- tions — a paradigm known as case-based rea- soning (CBR). We propose a neuro-symbolic CBR approach (CBR-KBQA) for question an- swering over large knowledge bases. CBR- KBQA consists of a nonparametric memory that stores cases (question and logical forms) and a parametric model that can generate a logical form for a new question by retrieving cases that are relevant to it. On several KBQA datasets that contain complex questions, CBR- KBQA achieves competitive performance. For example, on the COMPLEXWEBQUESTIONS dataset, CBR-KBQA outperforms the current state of the art by 11% on accuracy. Further- more, we show that CBR-KBQA is capable of using new cases without any further training: by incorporating a few human-labeled exam- ples in the case memory, CBR-KBQA is able to successfully generate logical forms containing unseen KB entities as well as relations. 1",
    "topics": [
      "t005"
    ],
    "keywords": [
      "knowledge",
      "graphs"
    ],
    "status": "processed",
    "uploadDate": "2026-05-19"
  },
  {
    "id": "p020",
    "title": "Unsupervised Dense Information Retrieval with Contrastive Learning",
    "authors": [
      "Contrastive Learning"
    ],
    "year": 2022,
    "abstract": "Recently, information retrieval has seen the emergence of dense retrievers, using neural networks, as an alternative to classical sparse methods based on term-frequency. These models have obtained state-of-the-art results on datasets and tasks where large training sets are available. However, they do not transfer well to new applications with no training data, and are outperformed by unsupervised term-frequency methods such as BM25. In this work, we explore the limits of contrastive learning as a way to train unsupervised dense retrievers and show that it leads to strong performance in various retrieval settings. On the BEIR benchmark our unsupervised model outperforms BM25 on 11 out of 15 datasets for the Recall@100. When used as pre-training before fine-tuning, either on a few thousands in-domain examples or on the large MS MARCO dataset, our contrastive model leads to improvements on the BEIR benchmark. Finally, we evaluate our approach for multi-lingual retrieval, where training data is even scarcer than for English, and show that our approach leads to strong unsupervised performance. Our model also exhibits strong cross-lingual transfer when fine-tuned on supervised English data only and evaluated on low resources language such as Swahili. We show that our unsupervised models can perform cross-lingual retrieval between different scripts, such as retrieving English documents from Arabic queries, which would not be possible with term matching methods. 1",
    "topics": [
      "t005"
    ],
    "keywords": [
      "knowledge",
      "graphs"
    ],
    "status": "processed",
    "uploadDate": "2026-05-20"
  }
];
